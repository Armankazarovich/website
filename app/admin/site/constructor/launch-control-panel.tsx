import { SmartStoreLauncher } from "@/components/site-constructor/smart-store-launcher";
import type {
  StoreConstructorBlueprint,
  StoreConstructorDomainStep,
  StoreConstructorImportColumn,
  StoreConstructorOnboardingStep,
  StoreConstructorQuestionnaireGroup,
} from "@/lib/store-constructor-blueprints";

type LaunchControlPanelProps = {
  blueprints: StoreConstructorBlueprint[];
  onboardingSteps: StoreConstructorOnboardingStep[];
  domainSteps: StoreConstructorDomainStep[];
  questionnaire: StoreConstructorQuestionnaireGroup[];
  importColumns: StoreConstructorImportColumn[];
};

export function LaunchControlPanel({
  blueprints,
  questionnaire,
  importColumns,
}: LaunchControlPanelProps) {
  return (
    <SmartStoreLauncher
      blueprints={blueprints}
      questionnaire={questionnaire}
      importColumns={importColumns}
      referralSource="PiloRus"
      mode="admin"
    />
  );
}
