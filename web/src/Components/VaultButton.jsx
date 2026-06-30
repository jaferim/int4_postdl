import { useVault } from "../lib/vault-context.js";
import Vault from "./jsx-assets/Vault.jsx";


const VaultButton = () => {
  const { count, toggleOpen, isOpen } = useVault();

  return (
    <button
      type="button"
      onClick={toggleOpen}
      aria-label={`Open your Vault (${count} saved)`}
      aria-expanded={isOpen}
      className="z-30 flex-centered aspect-square h-12 lg:h-14 rounded-xs border-[0.8px] border-text-main bg-text-main/20 backdrop-blur-2xl cursor-pointer hover:bg-text-main/30 hover:rotate-10 transition-all group"
    >
      <Vault className="w-6 lg:w-7 h-auto group-hover:-rotate-10 transition-all" />
      {count > 0 && (
        <span className="absolute group-hover:-rotate-10 transition-all -top-2 -right-2 flex-centered min-w-5 h-5 px-1 bg-text-main text-normalbg caption font-body-bold">
          {count}
        </span>
      )}
    </button>
  );
};

export default VaultButton;
