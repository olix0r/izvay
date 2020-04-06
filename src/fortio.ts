export interface Report {
    Labels: string;
    ActualQPS: number;
    ActualDuration: number;
    DurationHistogram: DurationHistogram;
}

export interface DurationHistogram {
    Count: number;
    Min: number;
    Max: number;
    Sum: number;
    Avg: number;
    StdDev: number;
    Data: Array<DurationHistogramBucket>;
    Percentiles: Array<Percentile>;
};

export interface DurationHistogramBucket {
    Start: number;
    End: number;
    Percent: number;
    Count: number;
}

export interface Percentile {
    Percentile: number;
    Value: number;
}
