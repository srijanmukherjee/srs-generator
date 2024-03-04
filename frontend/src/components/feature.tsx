import { useEffect, useState } from "react";
import { ISelectionData, TFeature } from "../types";
import Checkbox from "./checkbox";

interface FeatureProps {
    feature: TFeature;
    depth?: number;
    selection: ISelectionData;
    onChange?: () => void;
    parentState?: number;
}

export default function Feature({
    feature,
    selection,
    onChange = () => {},
    depth = 0,
    parentState = 2,
}: FeatureProps) {
    const [checked, setChecked] = useState(true);
    const [childState, setChildState] = useState(2);
    const [partial, setPartial] = useState(false);

    const handleChildChange = () => {
        const children = Object.values(selection.child);
        const selectedCount = children.filter((child) => child.checked).length;

        selection.checked = selectedCount > 0;

        if (selectedCount === children.length) {
            setChecked(true);
            setPartial(false);
            setChildState(2);
        } else if (selectedCount === 0) {
            setChecked(false);
            setPartial(false);
            setChildState(0);
        } else {
            setChecked(true);
            setPartial(true);
            setChildState(1);
        }

        onChange();
    };

    const handleCheckbox = (value: boolean) => {
        selection.checked = value;
        setChecked(value);
        setPartial(false);
        setChildState(value ? 2 : 0);

        // propagate changes in lower level to higher levels
        onChange();
    };

    // update child state when parent state changes
    useEffect(() => {
        let value: boolean;
        if (parentState === 0) value = false;
        else if (parentState === 2) value = true;
        else value = selection.checked;
        setChecked(value);
        setPartial(false);
        selection.checked = value;
    }, [parentState, selection]);

    return (
        <div className="flex flex-col gap-5">
            <div
                className="flex items-center gap-2"
                style={{ paddingLeft: `${depth * 5}em` }}>
                <div>
                    <Checkbox
                        checked={checked}
                        onChange={handleCheckbox}
                        indeterminate={partial}
                    />
                </div>
                <div>
                    <div className="font-semibold">{feature.name}</div>
                    <div className="text-sm text-neutral-600">
                        {feature.description}
                    </div>
                </div>
            </div>
            {feature.features?.map((subfeature) => (
                <Feature
                    key={subfeature.id}
                    feature={subfeature}
                    depth={depth + 1}
                    selection={selection.child[subfeature.id]}
                    onChange={handleChildChange}
                    parentState={childState}
                />
            ))}
        </div>
    );
}
