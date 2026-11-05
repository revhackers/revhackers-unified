import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import MaterialModal from '@/components/shared/MaterialModal';
import { materialsData } from '@/data/materialsData';
import ArticleCTA from './ArticleCTA';

interface StrategicConclusionProps {
    title?: string;
    description?: string;
    ctaText?: string;
    ctaLink?: string;
    leadMagnetId?: string;
    diagnosticPath?: string;
    onCTAClick?: () => void;
}

const StrategicConclusion = ({
    title = "Vamos construir sua Máquina de Vendas?",
    description = "Não perca mais tempo com processos que não escalam. Nossa consultoria desenha e implementa seus playbooks em 90 dias.",
    ctaText = "Agendar Diagnóstico",
    ctaLink = "/agenda-diagnostico",
    leadMagnetId,
    diagnosticPath,
    onCTAClick
}: StrategicConclusionProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();
    const material = leadMagnetId ? materialsData.find((m) => m.slug === leadMagnetId) : undefined;

    const handlePrimaryClick = () => {
        if (diagnosticPath) {
            navigate(diagnosticPath);
            window.scrollTo(0, 0);
        } else if (onCTAClick) {
            onCTAClick();
        } else {
            window.location.href = ctaLink;
        }
    };

    const handleSecondaryClick = () => {
        if (material) {
            setIsModalOpen(true);
        }
    };

    return (
        <>
            <ArticleCTA
                title={title}
                description={description}
                primaryBtnText={ctaText}
                secondaryBtnText={material ? 'Baixar material' : undefined}
                onPrimaryClick={handlePrimaryClick}
                onSecondaryClick={handleSecondaryClick}
            />

            {material && (
                <MaterialModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    material={material}
                    onSuccess={() => setIsModalOpen(false)}
                />
            )}
        </>
    );
};

export default StrategicConclusion;
