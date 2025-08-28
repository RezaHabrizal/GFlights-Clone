export function Field({ label, children }) {
    return (
        <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">{label}</span>
            {children}
        </label>
    );
}