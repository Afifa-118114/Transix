import { FiExternalLink } from "react-icons/fi";

function BookNowButton({ train }) {
  return (
    <a
      href="https://www.irctc.co.in/nget/train-search"
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-center text-xs font-bold text-white shadow-2xs transition hover:bg-indigo-700"
    >
      <span>Book on IRCTC</span>
      <FiExternalLink className="text-xs" />
    </a>
  );
}

export default BookNowButton;
