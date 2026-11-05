import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { GhlFormEmbed } from './GhlFormEmbed';
import { GHL_FORMS } from '@/config/ghl';
import { removeEmojis } from '@/utils/stringUtils';

interface MaterialModalProps {
    isOpen: boolean;
    onClose: () => void;
    material: {
        title?: string;
        material_name?: string;
        type?: string;
        material_type?: string;
        materialId?: string;
        id?: string;
        slug?: string;
        link_material?: string;
        material_url?: string;
    } | null;
    onSuccess: () => void;
}

const MaterialModal = ({ isOpen, onClose, material, onSuccess }: MaterialModalProps) => {
    if (!material) return null;
    if (!material.link_material) console.error('[MaterialModal] link_material ausente', material.slug ?? material.title);

    const cleanTitle = (html: string) => {
        const div = document.createElement('div');
        div.innerHTML = html;
        const text = div.textContent || div.innerText || '';
        return removeEmojis(text);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-white border border-zinc-200/80 p-8 sm:p-10 shadow-2xl rounded-3xl text-left">
                <DialogHeader className="mb-6 space-y-1 text-left">
                    <DialogTitle className="text-xl font-bold text-zinc-900 tracking-tight">
                        Solicitar Análise
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm text-zinc-500">
                        Preencha para análise técnica de perfil. Resposta em até 24h.
                    </DialogDescription>
                </DialogHeader>

                <div className="text-left">
                    {material.link_material ? (
                        <GhlFormEmbed
                            formId={GHL_FORMS.materiais}
                            title="Receber material"
                            params={{
                                material_slug: material.slug || '',
                                material_title: cleanTitle(material.title || material.material_name || ''),
                                material_link: material.link_material,
                            }}
                            onSubmitted={onSuccess}
                        />
                    ) : (
                        <p className="text-sm text-zinc-500">Material indisponível no momento.</p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default MaterialModal;
