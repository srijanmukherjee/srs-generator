export type TDomainList = {
    name: string;
    description: string;
    slug: string;
}[];

export type TFeature = {
    id: string;
    name: string,
    description: string,
    time_estimate: number,
    staffs: string[],
    features?: TFeature[]
};

export type TDomain = {
    name: string,
    description: string,
    slug: string,
    features: TFeature[]
};

export interface ISelection {
    [key: string]: ISelectionData;
}

export interface ISelectionData {
    checked: boolean;
    child: ISelection;
}