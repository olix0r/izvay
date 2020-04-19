export type Report = {
    Labels: string;
    ActualQPS: number;
    ActualDuration: number;
    DurationHistogram: DurationHistogram;
};

export type DurationHistogram = {
    Count: number;
    Min: number;
    Max: number;
    Sum: number;
    Avg: number;
    StdDev: number;
    Data: Array<Bucket>;
    Percentiles: Array<Percentile>;
};

export type Bucket = {
    Start: number;
    End: number;
    Percent: number;
    Count: number;
}

export type Percentile = {
    Percentile: number;
    Value: number;
}
