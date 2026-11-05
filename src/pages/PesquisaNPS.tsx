import { useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { Card } from '@/components/ui/card';
import { GHL_EMBED_BASE, GHL_SURVEYS } from '@/config/ghl';

const PesquisaNPS = () => {
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
    
    // Dynamically load the external script
    const script = document.createElement('script');
    script.src = `${GHL_EMBED_BASE}/js/form_embed.js`;
    script.async = true;
    document.body.appendChild(script);
    
    // Cleanup function to remove script when component unmounts
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <PageLayout>
      <section className="bg-background py-20 min-h-screen">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h1 className="section-title mb-6 text-foreground">
              Pesquisa de <span className="text-[#00CC6A]">Satisfação NPS</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Sua opinião é fundamental para continuarmos evoluindo. Compartilhe sua experiência conosco.
            </p>
          </div>

          <Card className="max-w-4xl mx-auto border-border/20 bg-card/50 backdrop-blur-sm shadow-soft">
            <div className="relative w-full">
              <iframe 
                src={`${GHL_EMBED_BASE}/widget/survey/${GHL_SURVEYS.nps}`} 
                style={{
                  border: 'none',
                  width: '100%',
                  minHeight: '600px'
                }} 
                scrolling="no" 
                id={GHL_SURVEYS.nps} 
                title="Pesquisa de Satisfação NPS"
                className=""
              />
            </div>
          </Card>
        </div>
      </section>
    </PageLayout>
  );
};

export default PesquisaNPS;
