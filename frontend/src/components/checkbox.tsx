import { useEffect, useRef } from "react";

interface Props {
    indeterminate?: boolean;
    onChange: (value: boolean) => void;
    checked: boolean;
}

export default function Checkbox({
    checked,
    onChange,
    indeterminate = false,
}: Props) {
    const checkboxRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (checkboxRef.current) {
            checkboxRef.current.indeterminate = indeterminate;
        }
    }, [checkboxRef, indeterminate]);

    return (
        <div className="inline-flex items-center p-3 rounded-full cursor-pointer">
            <input
                type="checkbox"
                className="h-5 w-5 cursor-pointer"
                ref={checkboxRef}
                checked={checked}
                onChange={(event) => onChange(event.currentTarget.checked)}
            />
        </div>
    );
}
