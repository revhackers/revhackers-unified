import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ReiFormData } from './types';
import BasicInfoSection from './BasicInfoSection';
import ProductSection from './ProductSection';
import ProblemSection from './ProblemSection';
import CustomerSection from './CustomerSection';
import MarketSection from './MarketSection';
import SalesSection from './SalesSection';
import ResourcesSection from './ResourcesSection';
import ThankYouMessage from './ThankYouMessage';

const ReiForm = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState<ReiFormData>({
    name: '',
    role: '',
    email: '',
    whatsapp: '',
    companyName: '',
    companySite: '',
    sector: '',
    annualRevenue: '',
    expectedResults: '',
    solution: '',
    hasPlans: '',
    advantages: '',
    targetAudience: '',
    idealCustomerProfiles: '',
    demographicProfile: '',
    recurringProblems: '',
    customerPains: '',
    consequencesOfNotBuying: '',
    emotionalResponses: '',
    savesTimeOrMoney: '',
    whereCustomersSearch: '',
    problemCauses: '',
    customerLocations: '',
    keywords: '',
    challenges: '',
    differentiation: '',
    competitors: '',
    marketTrends: '',
    salesChannels: '',
    marketingTools: '',
    monthlyAdBudget: '',
    adScheduleRestrictions: '',
    adRegions: '',
    previousStrategies: '',
    salesCycle: '',
    leadNurturing: '',
    decisionFactors: '',
    growthStrategies: '',
    marketingMaterials: '',
    kpis: '',
    limitations: '',
    approvalProcess: '',
    sdrCount: '',
    closerCount: '',
    currentCrm: '',
    currentMarketingTool: ''
  });

  const sections = [
    { title: 'Informações Básicas', component: BasicInfoSection },
    { title: 'Produto e Expectativas', component: ProductSection },
    { title: 'Problemas e Dores', component: ProblemSection },
    { title: 'Comportamento do Cliente', component: CustomerSection },
    { title: 'Mercado e Concorrência', component: MarketSection },
    { title: 'Vendas e Marketing', component: SalesSection },
    { title: 'Recursos e Processos', component: ResourcesSection }
  ];

  // Definir campos obrigatórios por seção
  const requiredFieldsBySection = [
    // Seção 0 - Informações Básicas
    ['name', 'role', 'email', 'whatsapp', 'companyName', 'sector'],
    // Seção 1 - Produto e Expectativas
    ['expectedResults', 'solution', 'hasPlans', 'advantages', 'targetAudience'],
    // Seção 2 - Problemas e Dores
    ['idealCustomerProfiles', 'demographicProfile', 'recurringProblems', 'customerPains', 'consequencesOfNotBuying', 'savesTimeOrMoney'],
    // Seção 3 - Comportamento do Cliente
    ['whereCustomersSearch', 'problemCauses', 'customerLocations', 'keywords'],
    // Seção 4 - Mercado e Concorrência
    ['challenges', 'differentiation', 'competitors', 'marketTrends'],
    // Seção 5 - Vendas e Marketing
    ['salesChannels', 'marketingTools', 'adRegions'],
    // Seção 6 - Recursos e Processos
    ['salesCycle', 'decisionFactors', 'growthStrategies', 'kpis', 'approvalProcess']
  ];

  const fieldLabels: Record<string, string> = {
    name: 'Nome',
    role: 'Cargo',
    email: 'E-mail',
    whatsapp: 'WhatsApp',
    companyName: 'Nome da Empresa',
    sector: 'Setor',
    expectedResults: 'Resultados esperados nos próximos 12 meses',
    solution: 'Solução que sua empresa oferece',
    hasPlans: 'Se possui planos ou pacotes',
    advantages: 'Vantagens em relação aos concorrentes',
    targetAudience: 'Público-alvo',
    idealCustomerProfiles: 'Perfis ideais dos clientes',
    demographicProfile: 'Perfil demográfico do cliente ideal',
    recurringProblems: 'Problemas mais recorrentes que resolve',
    customerPains: 'Dores dos clientes',
    consequencesOfNotBuying: 'O que o cliente perde se não comprar',
    savesTimeOrMoney: 'Como economiza tempo ou dinheiro',
    whereCustomersSearch: 'Onde o cliente procura respostas',
    problemCauses: 'Causas dos problemas dos clientes',
    customerLocations: 'Locais que o cliente frequenta',
    keywords: 'Principais palavras-chave',
    challenges: 'Principais desafios da empresa',
    differentiation: 'Como se diferencia dos concorrentes',
    competitors: 'Concorrentes diretos',
    marketTrends: 'Tendências do mercado',
    salesChannels: 'Principais canais de vendas',
    marketingTools: 'Ferramentas de marketing utilizadas',
    adRegions: 'Regiões para veiculação de anúncios',
    salesCycle: 'Ciclo de vendas típico',
    decisionFactors: 'Principal fator de decisão dos clientes',
    growthStrategies: 'Estratégias de crescimento desejadas',
    kpis: 'Métricas ou KPIs acompanhados',
    approvalProcess: 'Processo de aprovação interno'
  };

  const validateCurrentSection = () => {
    const requiredFields = requiredFieldsBySection[currentSection];
    const emptyFields = requiredFields.filter(field => !formData[field as keyof ReiFormData].trim());
    
    if (emptyFields.length > 0) {
      const fieldNames = emptyFields.map(field => fieldLabels[field]).join(', ');
      toast({
        title: 'Campos obrigatórios não preenchidos',
        description: `Por favor, preencha: ${fieldNames}`,
        variant: 'destructive'
      });
      return false;
    }
    return true;
  };

  const handleInputChange = (name: keyof ReiFormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    if (validateCurrentSection() && currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
    }
  };

  const handlePrev = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentSection()) return;
    
    setIsSubmitting(true);
    
    try {
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao enviar o formulário. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return <ThankYouMessage />;
  }

  const CurrentSection = sections[currentSection].component;
  const progress = ((currentSection + 1) / sections.length) * 100;

  return (
    <Card className="max-w-4xl mx-auto bg-black border border-white/10 p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">
          REI - Revenue Excellence Initiative
        </h2>
        <div className="w-full bg-zinc-800 rounded-full h-2 mb-4">
          <div 
            className="bg-revgreen h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-zinc-300">
          Seção {currentSection + 1} de {sections.length}: {sections[currentSection].title}
        </p>
      </div>

      <CurrentSection 
        formData={formData} 
        onChange={handleInputChange}
      />

      <div className="flex justify-between mt-8 pt-6 border-t border-zinc-700">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrev}
          disabled={currentSection === 0}
          className="px-8"
        >
          Anterior
        </Button>

        {currentSection < sections.length - 1 ? (
          <Button
            type="button"
            onClick={handleNext}
            className="px-8"
          >
            Próximo
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-8"
          >
            {isSubmitting ? 'Enviando...' : 'Finalizar'}
          </Button>
        )}
      </div>
    </Card>
  );
};

export default ReiForm;
