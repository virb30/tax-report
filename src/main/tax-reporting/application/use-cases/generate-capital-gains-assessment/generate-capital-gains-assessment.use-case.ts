import type { CapitalGainsAssessmentQuery } from '../../queries/capital-gains-assessment.query';
import type { CapitalGainsAssessmentService } from '../../../domain/capital-gains-assessment.service';
import type { CapitalGainsLossCompensationService } from '../../../domain/capital-gains-loss-compensation.service';
import type { GenerateCapitalGainsAssessmentInput } from './generate-capital-gains-assessment.input';
import type { GenerateCapitalGainsAssessmentOutput } from './generate-capital-gains-assessment.output';

export class GenerateCapitalGainsAssessmentUseCase {
  constructor(
    private readonly query: CapitalGainsAssessmentQuery,
    private readonly assessmentService: CapitalGainsAssessmentService,
    private readonly lossCompensationService: CapitalGainsLossCompensationService,
  ) {}

  async execute(
    input: GenerateCapitalGainsAssessmentInput,
  ): Promise<GenerateCapitalGainsAssessmentOutput> {
    const facts = await this.query.findSourceFacts({ baseYear: input.baseYear });
    const saleAssessment = this.assessmentService.assess(facts);
    const monthlyAssessment = this.lossCompensationService.assess({
      baseYear: input.baseYear,
      saleTraces: saleAssessment.saleTraces,
      blockers: saleAssessment.blockers,
    });

    return {
      baseYear: input.baseYear,
      generatedAt: new Date().toISOString(),
      annualTotals: monthlyAssessment.annualTotals,
      months: monthlyAssessment.months,
      summaryBlockers: monthlyAssessment.summaryBlockers,
    };
  }
}
