import { GhlFormEmbed } from '@/components/shared/GhlFormEmbed';
import { GHL_FORMS } from '@/config/ghl';

interface ContactFormProps {
  formType?: 'diagnosis' | 'contact';
  variant?: 'light' | 'dark';
  onSuccess?: () => void;
}

const ContactForm = ({ formType = 'contact', variant = 'light', onSuccess }: ContactFormProps) => {
  const wrapperClass = variant === 'dark' ? 'bg-zinc-900 rounded-2xl p-4 sm:p-6' : '';

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
