import { enicsCase } from './enics';
import { heinekenCase } from './heineken';
import { agenceMrCase } from './agence-mr';
import { toeflCase } from './toefl';
import { emagrecentroCase } from './emagrecentro';
import { placluxCase } from './placlux';
import { fmuVirtualCase } from './fmu-virtual';
import { funnelsCase } from './funnels';
import { cruzeiroSulCase } from './cruzeiro-sul';
import { btDigitalCase } from './bt-digital';
import { tikpagCase } from './tikpag';
import { tegraCase } from './tegra';
import { enoveCase } from './enove';
import { lindoyaCase } from './lindoya';
import { wysionCase } from './wysion';
import { ideeCase } from './idee';
import { anhembiMorumbiCase } from './anhembi-morumbi';
import { bldnCase } from './bldn';

// Type definition for a case study
export interface CaseStudy {
  title: string;
  category: string;
  logo: string;
  whiteLogo?: string;
  coverImage: string;
  challenge: string;
  solution: string;
  results: string[];
  metrics: {
    value: string;
    label: string;
  }[];
  quote: string;
  author: string;
  role: string;
  authorImage?: string;
  description?: string;
  preview_description?: string;
  tags?: string[];
  featured?: boolean;
  isWideLogo?: boolean;
  logoScale?: number;
  /** Período da intervenção (ex: "jan–jun/2024"). Exibir só quando preenchido. */
  period?: string;
  /** Fonte da medição (ex: "GA4", "relatório de mídia", "CRM do cliente"). */
  source?: string;
  techStack?: string[];
}

// Combine all cases into a single object
export const casesData: Record<string, CaseStudy> = {
  "heineken": heinekenCase,
  "lindoya": lindoyaCase,
  "fmu-virtual": fmuVirtualCase,
  "anhembi-morumbi": anhembiMorumbiCase,
  "cruzeiro-sul": cruzeiroSulCase,
  "emagrecentro": emagrecentroCase,
  "toefl": toeflCase,
  "agence-mr": agenceMrCase,
  "enics": enicsCase,
  "placlux": placluxCase,
  "funnels": funnelsCase,

  "bt-digital": btDigitalCase,
  "tikpag": tikpagCase,
  "enove": enoveCase,
  "wysion": wysionCase,
  "idee": ideeCase,
  "bldn": bldnCase
};

export type CaseStudyKey = keyof typeof casesData;
