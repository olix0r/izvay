import React from "react";
import Container from "@material-ui/core/Container";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";

import { Report } from "./fortio";

export type Dimensions = {
  maxLatency: number,
  maxRequests: number,
  rowHeight: number,
};

export type TopAxis = React.FC<Dimensions>;
export type VizProps = { report: Report, dimensions: Dimensions }
export type Viz = React.FC<VizProps>;
export type View = { TopAxis: TopAxis, Viz: Viz };

export type Section = {
  title: string,
  rows: Row[],
  dimensions: Dimensions,
  showAxis: boolean,
};

export type Row = {
  name: string,
  report: Report,
};

export type Props = {
  sections: Section[],
  view: View,
};

const ReportGrid: React.FC<Props> = ({ sections, view }) => {
  return (
    <Grid item sm={12}>
      <Paper elevation={2}>
        <Grid container spacing={3} direction='row'>
          {sections.map(({ title, rows, dimensions, showAxis }) => {
            return (
              <Grid item sm={12} key={`${title} `}>
                <Container>
                  <Paper elevation={2}>
                    <Grid container direction='column'>
                      <Grid container item sm={12}>
                        <Grid item sm={2} key='run'>
                          <Container>
                            <Typography>{title}</Typography>
                          </Container>
                        </Grid>
                        <Grid item sm={10} key='top-axis'>
                          {showAxis && <view.TopAxis {...dimensions} />}
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
                                <view.Viz report={report} dimensions={dimensions} />
                              </Grid>
                            </React.Fragment>
                          );
                        })}
                      </Grid>
                    </Grid>
                  </Paper>
                </Container>
              </Grid>
            );
          })}
        </Grid>
      </Paper>
    </Grid>
  );
};

export default ReportGrid;
