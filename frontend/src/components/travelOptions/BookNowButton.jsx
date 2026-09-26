import { FiExternalLink } from "react-icons/fi";

function BookNowButton({ train }) {
  return (
    <a
      href="https://www.irctc.co.in/nget/train-search"
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#034F46] py-2.5 text-center text-xs font-semibold text-white shadow-xs transition hover:bg-[#023c35]"
    >
      <span>Book on IRCTC Official</span>
      <FiExternalLink className="text-xs" />
    </a>
  );
}

export default BookNowButton;
