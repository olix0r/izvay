import React from "react";
import Container from "@material-ui/core/Container";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";

import { Report } from "./fortio";

// A group of report rows.
export type Section = {
  title: string,
  rows: Row[],
  dimensions: Dimensions,
  showAxis: boolean,
};

// A single report row.
export type Row = {
  name: string,
  report: Report,
};

export type Dimensions = {
  maxLatency: number,
  maxRequests: number,
  rowHeight: number,
};

export type TopAxis = React.FC<Dimensions>;
export type VizProps = { report: Report, dimensions: Dimensions };
export type Viz = React.FC<VizProps>;

// A strategy for rendering a section.
export type View = {
  TopAxis: TopAxis,
  Viz: Viz
};

type Props = {
  sections: Section[],
  view: View,
};


const ReportGrid = ({ sections, view }: Props) => {
  return (
    <Grid item sm={12}>
      <Grid container spacing={3} direction='row'>
        {sections.map(({ title, rows, showAxis, dimensions }) => {
          return (
            <Grid item sm={12} lg={6} key={`${title} `}>
              <Container>
                <Grid container direction='column'>
                  <Grid container item sm={12}>
                    <Grid item sm={2} key='run'>
                      <Container>
                        <Typography>{title}</Typography>
                      </Container>
                    </Grid>
                    <Grid item sm={10} key='top-axis'>
                      {showAxis && <Paper square><view.TopAxis {...dimensions} /></Paper>}
                    </Grid>
                  </Grid>
                  <Grid container item sm={12} alignItems='flex-start' direction='row'>
                    {rows.map(({ name, report }) => {
                      return (
                        <React.Fragment key={name}>
                          <Grid item container sm={2} direction='row'>
                            <Grid item sm={1}></Grid>
                            <Grid item sm={11}>
                              <Container>
                                <Typography variant='caption'>{name}</Typography>
                              </Container>
                            </Grid>
                          </Grid>
                          <Grid item sm={10}>
                            <Paper square>
                              <view.Viz report={report} dimensions={dimensions} />
                            </Paper>
                          </Grid>
                        </React.Fragment>
                      );
                    })}
                  </Grid>
                </Grid>
              </Container>
            </Grid>
          );
        })}
      </Grid>
    </Grid>
  );
};

export default ReportGrid;
