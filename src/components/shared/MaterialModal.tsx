import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { GhlFormEmbed } from './GhlFormEmbed';
import { GHL_FORMS } from '@/config/ghl';
import type { Material } from '@/data/materialsData';

interface MaterialModalProps {
    isOpen: boolean;
    onClose: () => void;
    material: Pick<Material, 'slug' | 'title'> | null;
    onSuccess: () => void;
}

const MaterialModal = ({ isOpen, onClose, material, onSuccess }: MaterialModalProps) => {
    const navigate = useNavigate();
    if (!material) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-white border border-zinc-200/80 p-8 sm:p-10 shadow-2xl rounded-3xl text-left">
                <DialogHeader className="mb-6 space-y-1 text-left">
                    <DialogTitle className="text-xl font-bold text-zinc-900 tracking-tight">
                        Receber material
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm text-zinc-500">
                        Preencha com seus dados corporativos. O material chega no seu e-mail.
                    </DialogDescription>
                </DialogHeader>

                <div className="text-left">
                    <GhlFormEmbed
                        formId={GHL_FORMS.materiais}
                        title="Receber material"
                        params={{
                            rh_material_slug: material.slug,
                            rh_material_title: material.title,
                        }}
                        onSubmitted={() => {
                            onSuccess();
                            navigate(`/materiais/obrigado?m=${encodeURIComponent(material.slug)}`);
                        }}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default MaterialModal;
