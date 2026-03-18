import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="w-full border-b bg-white">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-semibold text-gray-900">
          FeedbackApp
        </Link>
      </div>
    </header>
  );
}
