interface PostCTAProps {
  onClick: () => void;
}

const PostCTA = ({ onClick }: PostCTAProps) => (
  <section className="mt-16 border-t-2 border-zinc-900 pt-8">
    <h2 className="text-2xl font-extrabold text-zinc-950">Pronto para o próximo nível?</h2>
    <p className="mt-2 max-w-[41rem] text-zinc-600">
      A RevHackers ajuda empresas de tecnologia a estruturarem playbooks de crescimento previsível.
    </p>
    <button type="button" onClick={onClick} className="mt-6 h-12 bg-[#00CC6A] px-6 font-bold text-black">
      Agendar Diagnóstico
    </button>
  </section>
);

export default PostCTA;
