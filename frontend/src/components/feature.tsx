import { useEffect, useState } from "react";
import { ISelectionData, TFeature } from "../types";
import Checkbox from "./checkbox";

interface FeatureProps {
    feature: TFeature;
    depth?: number;
    selection: ISelectionData;
    onChange?: () => void;
    parentChecked?: boolean;
}


export default function Feature({
    feature,
    selection,
    onChange = () => {},
    depth = 0,
    parentChecked = true,
}: FeatureProps) {
    const [checked, setChecked] = useState(true);
    const [childChecked, setChildChecked] = useState(true);
    const [partial, setPartial] = useState(false);

    const handleChildChange = () => {
        const children = Object.values(selection.child);
        const selectedCount = children.filter((child) => child.checked).length;

        selection.checked = selectedCount > 0;

        if (selectedCount === children.length) {
            setChecked(true);
            setPartial(false);
            setChildChecked(true);
        } else if (selectedCount === 0) {
            setChecked(false);
            setPartial(false);
            setChildChecked(false);
        } else {
            setChecked(true);
            setPartial(true);
        }

        onChange();
    };

    const handleCheckbox = (value: boolean) => {
        setChecked(value);
        setPartial(false);
        setChildChecked(value);
        selection.checked = value;
        // propagate changes in lower level to higher levels
        onChange();
    };

    // update child state when parent state changes
    useEffect(() => {
        setChecked(parentChecked);
        setPartial(false);
        selection.checked = parentChecked;
    }, [parentChecked, selection]);

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
                    parentChecked={childChecked}
                />
            ))}
        </div>
    );
}
