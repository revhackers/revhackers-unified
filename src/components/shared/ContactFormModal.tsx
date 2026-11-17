import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import ContactForm from './ContactForm';

interface ContactFormModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ContactFormModal = ({ isOpen, onClose }: ContactFormModalProps) => {
    const navigate = useNavigate();

    const handleSuccess = () => {
        onClose();
        navigate('/obrigado?from=especialista');
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-white border border-zinc-200/80 p-8 sm:p-10 shadow-2xl rounded-3xl text-left">
                <DialogHeader className="mb-6 space-y-1 text-left">
                    <DialogTitle className="text-xl font-bold text-zinc-900 tracking-tight">
                        Falar com Especialista
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm text-zinc-500">
                        Preencha para agendar sua sessão técnica de 30 minutos, sem custo.
                    </DialogDescription>
                </DialogHeader>

                <div className="text-left">
                    <ContactForm formType="diagnosis" variant="light" onSuccess={handleSuccess} />
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ContactFormModal;
