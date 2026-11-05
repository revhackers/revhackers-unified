import { GhlFormEmbed } from '@/components/shared/GhlFormEmbed';
import { GHL_FORMS } from '@/config/ghl';

interface NewsletterFormProps {
  variant?: 'default' | 'footer';
}

const NewsletterForm = ({ variant = 'default' }: NewsletterFormProps) => (
  <GhlFormEmbed
    formId={GHL_FORMS.newsletter}
    title="Newsletter RevHackers"
    minHeight={variant === 'footer' ? 260 : 300}
  />
);

export default NewsletterForm;
