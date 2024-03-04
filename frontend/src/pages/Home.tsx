import { Link, useLoaderData } from "react-router-dom";
import { TDomainList } from "../types";

export function HomePage() {
    const domains = useLoaderData() as TDomainList;
    return (
        <div className="h-screen overflow-auto grid place-items-center p-5">
            <div>
                <h1 className="text-3xl mb-2 text-center font-semibold flex-1">
                    SRS Document Generator
                </h1>
                <h2 className="text-xl mb-10 text-center font-semibold flex-1">
                    What type of application do you want to make?
                </h2>
                <div className="flex flex-wrap gap-5 justify-center">
                    {domains.map(({ name, slug }) => (
                        <Link
                            key={slug}
                            to={`/domains/${slug}`}
                            className="w-48 h-48 p-5 grid place-items-center bg-neutral-900 hover:bg-neutral-800 text-white text-center rounded-md shadow-sm font-semibold">
                            {name}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
