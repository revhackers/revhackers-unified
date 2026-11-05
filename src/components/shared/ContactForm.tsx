import { GhlFormEmbed } from '@/components/shared/GhlFormEmbed';
import { GHL_FORMS } from '@/config/ghl';
import type { Material } from '@/data/materialsData';

interface ContactFormProps {
  formType?: 'diagnosis' | 'contact' | 'material';
  variant?: 'light' | 'dark';
  material?: Material;
  onSuccess?: () => void;
}

const ContactForm = ({ formType = 'contact', variant = 'light', material, onSuccess }: ContactFormProps) => {
  const wrapperClass = variant === 'dark' ? 'bg-zinc-900 rounded-2xl p-4 sm:p-6' : '';

  if (formType === 'material') {
    if (!material?.link_material) {
      console.error('[ContactForm] material sem link_material; formulário não renderizado');
      return <p className="text-sm text-zinc-600">Material indisponível no momento.</p>;
    }
    return (
      <div className={wrapperClass}>
        <GhlFormEmbed
          formId={GHL_FORMS.materiais}
          title={`Receber ${material.title}`}
          params={{
            material_slug: material.slug,
            material_title: material.title,
            material_link: material.link_material,
          }}
          onSubmitted={onSuccess}
        />
      </div>
    );
  }

  const isDiagnosis = formType === 'diagnosis';
  return (
    <div className={wrapperClass}>
      <GhlFormEmbed
        formId={isDiagnosis ? GHL_FORMS.diagnostico : GHL_FORMS.contato}
        title={isDiagnosis ? 'Agendar diagnóstico' : 'Fale com a RevHackers'}
        onSubmitted={onSuccess}
      />
    </div>
  );
};

export default ContactForm;
