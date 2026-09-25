import { PlatformRulesConfig } from "@/types/rules";
import { DEFAULT_PLATFORM_RULES } from "./mock/rules.mock";

class RulesService {
  private config: PlatformRulesConfig = { ...DEFAULT_PLATFORM_RULES };

  async getRules(): Promise<PlatformRulesConfig> {
    return { ...this.config };
  }

  async updateRules(updated: Partial<PlatformRulesConfig>, adminName = "Super Admin"): Promise<PlatformRulesConfig> {
    this.config = {
      dealRules: {
        ...this.config.dealRules,
        ...(updated.dealRules ?? {}),
      },
      cancellationRules: {
        ...this.config.cancellationRules,
        ...(updated.cancellationRules ?? {}),
      },
      updatedAt: new Date().toISOString(),
      updatedBy: adminName,
    };
    return { ...this.config };
  }

  async resetToDefaults(adminName = "Super Admin"): Promise<PlatformRulesConfig> {
    this.config = {
      ...DEFAULT_PLATFORM_RULES,
      updatedAt: new Date().toISOString(),
      updatedBy: `${adminName} (Reset to Defaults)`,
    };
    return { ...this.config };
  }
}

export const rulesService = new RulesService();
