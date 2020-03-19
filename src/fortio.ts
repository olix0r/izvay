export interface Report {
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
    Data: Array<DurationHistogramData>;
    Percentiles: Array<Percentile>;
};

export interface DurationHistogramData {
    Start: number;
    End: number;
    Percent: number;
    Count: number;
}

export interface Percentile {
    Percentile: number;
    Value: number;
}
