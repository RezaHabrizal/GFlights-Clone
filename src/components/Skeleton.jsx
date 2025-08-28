import { classNames } from "../utils/classNames";

export function Skeleton({ className }) {
    return <div className={classNames("animate-pulse bg-gray-200 rounded", className)} />;
}