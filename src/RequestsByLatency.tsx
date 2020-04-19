import * as d3 from "d3";
import React from "react";
import styled from "@emotion/styled";

import { Bucket } from './fortio';
import * as ReportGrid from './ReportGrid';

const SvgStyled = styled.svg`
  height: 100%;
  width: 100%;
  //background-color: #666;
`;

export const TopAxis: ReportGrid.TopAxis = ({ maxLatency, rowHeight }) => {
    const draw = (element: SVGSVGElement) => {
        if (element === null || !maxLatency) {
            return;
        }

        const { width } = element.getBoundingClientRect();
        const svg = d3
            .select(element)
            //.attr("preserveAspectRatio", "xMinYMin meet")
            .attr("preserveAspectRatio", "none")
            .attr("viewBox", `0 0 ${width} ${rowHeight * 1.5}`);

        const x = d3
            .scaleLinear()
            .domain([0, maxLatency!])
            .rangeRound([15, width - 15]);

        svg.append("g").call(g => {
            g.attr("transform", `translate(0,${rowHeight * 1.5})`)
                .call(
                    d3.axisTop(x)
                        .tickSize(rowHeight / 2)
                        .tickFormat(n => `${n.valueOf() * 1000}ms`)
                )
        });
    };

    return <SvgStyled ref={React.useCallback(draw, [maxLatency, rowHeight])} />;
};

export const HeatMap: ReportGrid.Viz = ({ report, dimensions }) => {
    const draw = (element: SVGSVGElement) => {
        if (report === undefined || element === null) {
            return;
        }
        const { width } = element.getBoundingClientRect();

        const x = d3
            .scaleLinear()
            .domain([0, dimensions.maxLatency!])
            .rangeRound([15, width - 15]);

        const svg = d3
            .select(element)
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", `0 0 ${width} ${dimensions.rowHeight}`);

        const scale = (latency: number) => Math.pow(latency, 1 / 4);
        const boxColor = d3
            .scaleSequential(d3.interpolateGreens)
            .domain([0, scale(dimensions.maxRequests!)]);
        const barColor = d3
            .scaleOrdinal(d3.schemeYlOrRd[5])
            .domain(["50", "75", "90", "99", "99.9"]);

        const row = svg
            .append("g")
            .attr("transform", `translate(0,0)`)
            .selectAll("g")
            .data([report])
            .join("g");

        row
            .append("g")
            .selectAll("rect")
            .data(r => fillGaps(r.fortio.DurationHistogram.Data))
            .join("rect")
            .attr("x", d => x(d.Start) + 1)
            .attr("width", d => x(d.End) - x(d.Start))
            .attr("height", dimensions.rowHeight)
            .attr("fill", d => boxColor(scale(d.Count)))
            .append("title")
            .text(d => `${d.Count} reqs [${d.Start * 1000}ms..${d.End * 1000}ms)`);

        row
            .append("g")
            .selectAll("rect")
            .data(({ fortio }) => fortio.DurationHistogram.Percentiles)
            .join("rect")
            .attr("x", p => x(p.Value))
            .attr("y", dimensions.rowHeight / 3)
            .attr("height", dimensions.rowHeight / 3)
            .attr("width", dimensions.rowHeight / 6)
            .attr("fill", p => barColor(`${p.Percentile}`))
            .append("title")
            .text(p => `${p.Percentile} percentile ${p.Value * 1000}ms`);
    };

    return <SvgStyled ref={React.useCallback(draw, [report, dimensions])} />;
};

const fillGaps = (original: Bucket[]) => {
    let filled: Bucket[] = [];
    for (let bucket of original) {
        // If there's a gap between the prior bucket and this one, insert an empty bucket in the gap.
        if (filled.length > 0 && filled[filled.length - 1].End < bucket.Start) {
            filled.push({
                Start: filled[filled.length - 1].End,
                End: bucket.Start,
                Count: 0,
                Percent: 0,
            });
        }
        filled.push(bucket);
    }
    return filled;
};
