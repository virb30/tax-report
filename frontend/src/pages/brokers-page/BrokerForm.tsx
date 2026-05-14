import type { JSX } from 'react';

type BrokerFormValues = {
  code: string;
  name: string;
  cnpj: string;
};

type BrokerFormProps = {
  title: string;
  submitLabel: string;
  isSubmitting: boolean;
  values: BrokerFormValues;
  onChange: (field: keyof BrokerFormValues, value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
};

export function BrokerForm({
  title,
  submitLabel,
  isSubmitting,
  values,
  onChange,
  onSubmit,
  onCancel,
}: BrokerFormProps): JSX.Element {
  const isSubmitDisabled =
    isSubmitting ||
    values.name.trim().length === 0 ||
    values.code.trim().length === 0 ||
    values.cnpj.trim().length === 0;

  return (
    <>
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Codigo
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            value={values.code}
            onChange={(event) => onChange('code', event.target.value)}
            placeholder="Ex: XP"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Nome
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            value={values.name}
            onChange={(event) => onChange('name', event.target.value)}
            placeholder="Ex: Minha Corretora"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          CNPJ
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            value={values.cnpj}
            onChange={(event) => onChange('cnpj', event.target.value)}
            placeholder="00.000.000/0001-00"
          />
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        {onCancel ? (
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
            onClick={onCancel}
          >
            Cancelar
          </button>
        ) : null}
        <button
          type="button"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          onClick={onSubmit}
          disabled={isSubmitDisabled}
        >
          {isSubmitting ? 'Salvando...' : submitLabel}
        </button>
      </div>
    </>
  );
}
