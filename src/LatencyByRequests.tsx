import * as d3 from "d3";
import React, { FunctionComponent, useCallback } from "react";
import styled from "@emotion/styled";

import { DurationHistogramBucket } from './fortio';
import { Report } from './Reports';

export type Dimensions = {
    maxLatency: number,
    maxRequests: number,
    rowHeight: number,
}

const SvgStyled = styled.svg`
  height: 100%;
  width: 100%;
  //background-color: #666;
`;

interface Bucket {
    prior: number;
    bucket: DurationHistogramBucket;
}

function toBuckets({ fortio }: Report): Bucket[] {
    let buckets = [];
    let prior = 0;
    for (let bucket of fortio.DurationHistogram.Data) {
        buckets.push({ prior, bucket });
        prior += bucket.Count;
    }
    return buckets;
}

export const TopAxis: FunctionComponent<Dimensions> =
    ({ maxRequests, rowHeight }) => {
        const drawAxis = (element: SVGSVGElement) => {
            if (element === null || !maxRequests) {
                return;
            }

            const { width } = element.getBoundingClientRect();
            const svg = d3
                .select(element)
                .attr("preserveAspectRatio", "xMinYMin meet")
                .attr("viewBox", `0 0 ${width} ${rowHeight * 1.5}`);

            const x = d3
                .scaleLinear()
                .domain([0, maxRequests!])
                .rangeRound([15, width - 15]);

            svg.append("g").call(g =>
                g
                    .attr("transform", `translate(0,${rowHeight * 1.5})`)
                    .call(
                        d3
                            .axisTop(x)
                            .tickSize(rowHeight / 2)
                            .tickFormat(n => `${n.valueOf() / 1000}K`)
                    )
            );
        };

        return <SvgStyled
            ref={useCallback(drawAxis, [maxRequests, rowHeight])}
        />;
    };

export const HeatMap: FunctionComponent<{ report: Report, dimensions: Dimensions }> =
    ({ report, dimensions }) => {
        const draw = (element: SVGSVGElement) => {
            if (report === undefined || element === null) {
                return;
            }

            const { width } = element.getBoundingClientRect();

            const x = d3
                .scaleLinear()
                .domain([0, dimensions.maxRequests!])
                .rangeRound([15, width - 15]);

            const svg = d3
                .select(element)
                //.attr("preserveAspectRatio", "xMinYMin meet")
                .attr("preserveAspectRatio", "none")
                .attr("viewBox", `0 0 ${width} ${dimensions.rowHeight}`);

            const boxColor = d3
                .scaleSequential(d3.interpolateYlGnBu)
                .domain([0, Math.pow(dimensions.maxLatency!, 0.5)]);

            const row = svg
                .append("g")
                .selectAll("g")
                .data([report])
                .join("g");

            row
                .append("g")
                .selectAll("rect")
                .data(toBuckets)
                .join("rect")
                .attr("x", ({ prior }) => x(prior) + 1)
                .attr("width", ({ prior, bucket }) => x(prior + bucket.Count) - x(prior))
                .attr("height", dimensions.rowHeight)
                .attr("fill", ({ bucket }) => boxColor(Math.pow(bucket.End, 0.5)))
                .append("title")
                .text(({ prior, bucket }) => `${prior + bucket.Count} reqs <${bucket.End * 1000}ms`);
        };

        return <SvgStyled
            ref={useCallback(draw, [report, dimensions])}
        />;
    };
