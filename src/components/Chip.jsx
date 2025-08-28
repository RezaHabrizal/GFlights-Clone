import { classNames } from "../utils/classNames"

export function Chip({ active, onClick, children }) {
    return (
        <button
            onClick={onClick}
            className={classNames(
                "px-3 py-1 rounded-full border text-sm",
                active ? "bg-gray-900   border-gray-900" : "bg-white hover:bg-gray-50"
            )}
        >
            {children}
        </button>
    );
}