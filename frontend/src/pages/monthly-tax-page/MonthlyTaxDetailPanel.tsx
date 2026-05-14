import type { JSX } from 'react';
import type {
  MonthlyTaxBlockedReason,
  MonthlyTaxCloseDetail,
  MonthlyTaxDisclosure,
  MonthlyTaxGroupCode,
  MonthlyTaxGroupDetail,
  MonthlyTaxOutcome,
  MonthlyTaxWorkspaceState,
} from '@/types/api.types';
import { MonthlyTaxSaleLinesTable } from './MonthlyTaxSaleLinesTable';

type MonthlyTaxDetailPanelProps = {
  detail: MonthlyTaxCloseDetail;
  onFollowRepair: (reason: MonthlyTaxBlockedReason) => void;
};

const groupOrder: MonthlyTaxGroupCode[] = ['geral-comum', 'geral-isento', 'fii'];

const stateLabels: Record<MonthlyTaxWorkspaceState, string> = {
  closed: 'Fechado',
  blocked: 'Bloqueado',
  obsolete: 'Desatualizado',
  needs_review: 'Revisar',
  below_threshold: 'Abaixo de R$ 10,00',
};

const outcomeLabels: Record<MonthlyTaxOutcome, string> = {
  no_tax: 'Sem imposto',
  exempt: 'Isento',
  tax_due: 'Imposto devido',
  below_threshold: 'Abaixo do minimo',
  blocked: 'Bloqueado',
};

const repairButtonLabels: Record<
  NonNullable<MonthlyTaxBlockedReason['repairTarget']>['hintCode'],
  string
> = {
  daily_broker_tax: 'Revisar taxas na importacao',
  irrf: 'Revisar IRRF na importacao',
  asset_type: 'Revisar ativo',
  broker_metadata: 'Revisar corretora',
};

const disclosureStyles: Record<MonthlyTaxDisclosure['severity'], string> = {
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  review: 'border-amber-200 bg-amber-50 text-amber-800',
};

export function MonthlyTaxDetailPanel({
  detail,
  onFollowRepair,
}: MonthlyTaxDetailPanelProps): JSX.Element {
  const groupsByCode = new Map(detail.groups.map((group) => [group.code, group]));

  return (
    <article className="rounded-md border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Detalhe de {formatMonth(detail.summary.month)}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Resultado: {outcomeLabels[detail.summary.outcome]} · Estado:{' '}
            {stateLabels[detail.summary.state]}
          </p>
        </div>
        <span className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700">
          Payload auditavel
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
        <DetailFact label="Vendas brutas" value={formatCurrency(detail.summary.grossSales)} />
        <DetailFact
          label="Resultado realizado"
          value={formatCurrency(detail.summary.realizedResult)}
        />
        <DetailFact
          label="Imposto antes de creditos"
          value={formatCurrency(detail.summary.taxBeforeCredits)}
        />
        <DetailFact label="IRRF usado" value={formatCurrency(detail.summary.irrfCreditUsed)} />
        <DetailFact label="Imposto liquido" value={formatCurrency(detail.summary.netTaxDue)} />
      </dl>

      <section className="mt-5">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Grupos fixos
        </h4>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {groupOrder.map((code) => {
            const group = groupsByCode.get(code);

            if (!group) {
              return (
                <div key={code} className="rounded-md border border-amber-200 bg-amber-50 p-4">
                  <h5 className="font-semibold text-amber-900">{fallbackGroupLabel(code)}</h5>
                  <p className="mt-2 text-sm text-amber-800">
                    Grupo nao retornado no payload de detalhe.
                  </p>
                </div>
              );
            }

            return <GroupCard key={group.code} group={group} />;
          })}
        </div>
      </section>

      {detail.blockedReasons.length > 0 ? (
        <section className="mt-5">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Motivos de bloqueio
          </h4>
          <div className="mt-3 grid gap-3">
            {detail.blockedReasons.map((reason) => (
              <BlockedReasonCard
                key={blockedReasonKey(reason)}
                reason={reason}
                onFollowRepair={onFollowRepair}
              />
            ))}
          </div>
        </section>
      ) : null}

      {detail.disclosures.length > 0 ? (
        <section className="mt-5">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Divulgacoes e revisoes
          </h4>
          <div className="mt-3 grid gap-2">
            {detail.disclosures.map((disclosure) => (
              <p
                key={`${disclosure.code}:${disclosure.message}`}
                className={`rounded-md border px-3 py-2 text-sm ${disclosureStyles[disclosure.severity]}`}
              >
                {disclosure.message}
              </p>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-5">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Carry-forward
        </h4>
        {detail.carryForward.closingBelowThresholdTax !== '0.00' ? (
          <p className="mt-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
            O payload informa {formatCurrency(detail.carryForward.closingBelowThresholdTax)} abaixo
            do minimo de recolhimento, carregado para os meses seguintes.
          </p>
        ) : null}
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <DetailFact
            label="Prejuizo comum inicial"
            value={formatCurrency(detail.carryForward.openingCommonLoss)}
          />
          <DetailFact
            label="Prejuizo comum final"
            value={formatCurrency(detail.carryForward.closingCommonLoss)}
          />
          <DetailFact
            label="Prejuizo FII inicial"
            value={formatCurrency(detail.carryForward.openingFiiLoss)}
          />
          <DetailFact
            label="Prejuizo FII final"
            value={formatCurrency(detail.carryForward.closingFiiLoss)}
          />
          <DetailFact
            label="Credito IRRF inicial"
            value={formatCurrency(detail.carryForward.openingIrrfCredit)}
          />
          <DetailFact
            label="Credito IRRF final"
            value={formatCurrency(detail.carryForward.closingIrrfCredit)}
          />
          <DetailFact
            label="Abaixo do minimo inicial"
            value={formatCurrency(detail.carryForward.openingBelowThresholdTax)}
          />
          <DetailFact
            label="Abaixo do minimo final"
            value={formatCurrency(detail.carryForward.closingBelowThresholdTax)}
          />
        </dl>
      </section>

      <MonthlyTaxSaleLinesTable saleLines={detail.saleLines} />
    </article>
  );
}

function GroupCard({ group }: { group: MonthlyTaxGroupDetail }): JSX.Element {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <h5 className="font-semibold text-slate-900">{group.label}</h5>
      <dl className="mt-3 grid gap-2 text-sm">
        <DetailFact label="Vendas brutas" value={formatCurrency(group.grossSales)} />
        <DetailFact label="Resultado realizado" value={formatCurrency(group.realizedResult)} />
        <DetailFact label="Prejuizo usado" value={formatCurrency(group.carriedLossIn)} />
        <DetailFact label="Prejuizo a carregar" value={formatCurrency(group.carriedLossOut)} />
        <DetailFact label="Base tributavel" value={formatCurrency(group.taxableBase)} />
        <DetailFact label="Aliquota" value={formatPercent(group.taxRate)} />
        <DetailFact label="Imposto devido" value={formatCurrency(group.taxDue)} />
        <DetailFact label="IRRF usado" value={formatCurrency(group.irrfCreditUsed)} />
      </dl>
    </div>
  );
}

function DetailFact({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-900">{value}</dd>
    </div>
  );
}

function BlockedReasonCard({
  reason,
  onFollowRepair,
}: {
  reason: MonthlyTaxBlockedReason;
  onFollowRepair: (reason: MonthlyTaxBlockedReason) => void;
}): JSX.Element {
  return (
    <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
      <p className="font-medium">{reason.message}</p>
      {reason.metadata ? (
        <p className="mt-2 text-rose-800">Contexto: {formatMetadata(reason.metadata)}</p>
      ) : null}
      {reason.repairTarget ? (
        <button
          type="button"
          className="mt-3 rounded-md bg-rose-800 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
          onClick={() => onFollowRepair(reason)}
        >
          {repairButtonLabels[reason.repairTarget.hintCode]}
        </button>
      ) : null}
    </div>
  );
}

function formatCurrency(value: string): string {
  return `R$ ${value}`;
}

function formatPercent(value: string): string {
  return `${value}%`;
}

function formatMonth(month: string): string {
  const [year, monthNumber] = month.split('-');

  if (!year || !monthNumber) {
    return month;
  }

  return `${monthNumber}/${year}`;
}

function fallbackGroupLabel(code: MonthlyTaxGroupCode): string {
  const labels: Record<MonthlyTaxGroupCode, string> = {
    'geral-comum': 'Geral - Comum',
    'geral-isento': 'Geral - Isento',
    fii: 'FII',
  };

  return labels[code];
}

function formatMetadata(metadata: NonNullable<MonthlyTaxBlockedReason['metadata']>): string {
  return Object.entries(metadata)
    .map(([key, value]) => {
      const renderedValue = Array.isArray(value) ? value.join(', ') : value;
      return `${key}: ${renderedValue}`;
    })
    .join('; ');
}

function blockedReasonKey(reason: MonthlyTaxBlockedReason): string {
  return `${reason.code}:${reason.message}:${formatMetadata(reason.metadata ?? {})}`;
}
