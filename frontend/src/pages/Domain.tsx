import { useLoaderData } from "react-router-dom";
import { ISelection, TDomain, TFeature } from "../types";
import { useEffect, useRef, useState } from "react";
import Feature from "../components/feature";

function dfs(features: TFeature[]) {
    const selection: ISelection = {};

    features.forEach((feature) => {
        selection[feature.id] = {
            checked: false,
            child: dfs(feature.features ?? []),
        };
    });

    return selection;
}

type SerializedSelection = {
    id: string;
    features?: SerializedSelection[];
};

function serializeSelection(selection: ISelection): SerializedSelection[] {
    const res: SerializedSelection[] = [];

    Object.entries(selection).forEach(([featId, { checked, child }]) => {
        if (!checked) return;
        const featSelection: SerializedSelection = {
            id: featId,
        };
        if (child && Object.keys(child).length > 0) {
            featSelection.features = serializeSelection(child);
        }
        res.push(featSelection);
    });

    return res;
}

export default function DomainPage() {
    const domain = useLoaderData() as TDomain;
    const selectionRef = useRef<ISelection>({});
    const [isLoading, setLoading] = useState(true);
    const [disabled, setDisabled] = useState(false);
    const [estimation, setEstimation] = useState<
        { cost: number; time: number } | undefined
    >();
    const [error, setError] = useState<string | undefined>();

    const handleChange = () => {
        const children = Object.values(selectionRef.current);
        const selectedCount = children.filter((child) => child.checked).length;
        setDisabled(selectedCount == 0);
    };

    const getEstimate = async () => {
        const selections = serializeSelection(selectionRef.current);
        const response = await fetch(
            `${import.meta.env.VITE_API_URL}/domains/${domain.slug}/estimate`,
            {
                method: "POST",
                body: JSON.stringify(selections),
                headers: {
                    "Content-Type": "application/json",
                },
            }
        ).catch(() => {
            return null;
        });

        if (!response || !response.ok) {
            setError("Failed to get your estimation, please try again later.");
            setEstimation(undefined);
            return;
        }

        setError(undefined);
        setEstimation(await response.json());
    };

    const downloadPDF = async () => {
        const selections = serializeSelection(selectionRef.current);
        const response = await fetch(
            `${import.meta.env.VITE_API_URL}/domains/${domain.slug}/download`,
            {
                method: "POST",
                body: JSON.stringify(selections),
                headers: {
                    "Content-Type": "application/json",
                },
            }
        ).catch(() => {
            return null;
        });

        if (!response || !response.ok) {
            setError(
                "Something went wrong while preparing your document, please try again later."
            );
            return;
        }

        let data: Blob;
        try {
            data = await response.blob();
        } catch (err) {
            setError(
                "Something went wrong while preparing your document, please try again later."
            );
            return;
        }

        const a = document.createElement("a");
        a.href = URL.createObjectURL(data);
        a.download = `${domain.slug}.pdf`;
        a.click();
        URL.revokeObjectURL(a.href);
        a.remove();
    };

    useEffect(() => {
        selectionRef.current = dfs(domain.features);
        setLoading(false);
    }, [domain]);

    if (isLoading) return <div>loading...</div>;

    return (
        <div className="py-5 px-3 max-w-full md:max-w-[80rem] mx-auto">
            <div className="px-2 py-1 rounded text-xs mb-2 bg-neutral-900 text-white max-w-fit">
                domain
            </div>
            <h1 className="text-3xl mb-2">{domain.name}</h1>
            <p className="mb-5">{domain.description}</p>
            <h2 className="text-2xl font-semibold mb-5">Select Features</h2>

            <div className="flex flex-col gap-5 mb-10">
                {domain.features.map((feature) => (
                    <Feature
                        feature={feature}
                        key={feature.id}
                        selection={selectionRef.current[feature.id]}
                        onChange={handleChange}
                    />
                ))}
            </div>

            <div className="flex gap-2 mb-5">
                <button
                    className="py-4 px-5 rounded bg-neutral-900 text-white cursor-pointer select-none hover:bg-neutral-800 disabled:cursor-auto disabled:bg-neutral-500"
                    onClick={getEstimate}
                    disabled={disabled}>
                    Get estimate
                </button>
                <button
                    className="py-4 px-5 rounded outline-neutral-900 outline outline-1 select-none cursor-pointer hover:bg-neutral-100 disabled:cursor-auto disabled:bg-neutral-200 disabled:outline-none"
                    disabled={disabled}
                    onClick={downloadPDF}>
                    Download PDF
                </button>
            </div>

            {error && (
                <div className="bg-red-100 rounded px-4 py-5 text-red-600 font-semibold">
                    {error}
                </div>
            )}

            {estimation && (
                <div className="px-4 py-5 bg-neutral-100 rounded">
                    <h2 className="text-xl">Estimation</h2>
                    <table className="table text-left">
                        <tr>
                            <th>Cost</th>
                            <td className="pl-5 flex items-center gap-2">
                                <span className="font-semibold text-xl">$</span>
                                {estimation.cost}
                            </td>
                        </tr>
                        <tr>
                            <th>Approx. duration</th>
                            <td className="pl-5">{estimation.time} hours</td>
                        </tr>
                    </table>
                    <div className="mt-3 text-neutral-500">
                        <span className="font-semibold">Note:</span> This is an
                        approximate estimate, to get an more accurate estimate
                        tailored to your needs please contact the company.
                    </div>
                </div>
            )}
        </div>
    );
}
