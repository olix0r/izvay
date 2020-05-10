import * as d3 from "d3";
import { group } from "d3-array"
import React, { useEffect, useState } from "react";
import { makeStyles, createStyles, Theme } from '@material-ui/core/styles';
import CssBaseline from "@material-ui/core/CssBaseline";
import Container from "@material-ui/core/Container";
import Grid from "@material-ui/core/Grid";
import SpeedDial from '@material-ui/lab/SpeedDial';
import SpeedDialIcon from '@material-ui/lab/SpeedDialIcon';
import SpeedDialAction from '@material-ui/lab/SpeedDialAction';
import Paper from "@material-ui/core/Paper";

import * as fortio from "./fortio";
import ReportGrid, { Section } from './ReportGrid'
import RequestsByLatency from './RequestsByLatency'
//import LatencyByRequests from './LatencyByRequests'

// Fetches a list of test results from the server.
async function getReports() {
  const rsp = await fetch("./reports.json");
  const reports: fortio.Report[] = await rsp.json();
  return reports.map(report => {
    const meta: Meta = JSON.parse(report.Labels);
    return { meta, ...report };
  });
}

type Meta = {
  name: string,
  run: string,
};
type Report = fortio.Report & {
  meta: Meta,
};

interface Grouping {
  sections(reports: Report[]): Section[];
};

const RowHeight = 20;

const Baseline = "baseline";

const byTestProfile = {
  by: "Test Profile",
  sections: (reports: Report[]) => {
    console.log(reports);
    const sections = group(reports, r => {
      console.log(typeof r.meta);
      return r.meta.name;
    });
    return Array.from(sections).flatMap(([title, rows]) => {
      return {
        title,
        showAxis: true,
        dimensions: {
          rowHeight: RowHeight,
          maxLatency: d3.max(rows, r => r.DurationHistogram.Max)!,
          maxRequests: d3.max(rows, r => r.DurationHistogram.Count)!,
        },
        rows: rows.map(report => {
          const name = report.meta.run;
          return { name, report };
        }).sort((a, b) => {
          if (a.name === b.name) {
            return 0;
          }
          if (a.name < b.name || a.name === Baseline) {
            return -1;
          }
          console.assert(a.name < b.name || b.name === Baseline);
          return 1;
        }),
      };
    });
  },
};


const byRun = {
  by: "Run",
  sections: (reports: Report[]) => {
    const sections = group(reports, r => r.meta.run);
    const dimensions = {
      rowHeight: RowHeight,
      maxLatency: d3.max(reports, r => r.DurationHistogram.Max)!,
      maxRequests: d3.max(reports, r => r.DurationHistogram.Count)!,
    };
    return Array.from(sections).flatMap(([title, rows], i) => {
      return {
        title,
        showAxis: i === 0,
        dimensions,
        rows: rows.map(report => {
          const name = report.meta.name;
          return { name, report };
        }).sort((a, b) => {
          if (a.name < b.name) {
            return -1;
          }
          console.assert(a.name < b.name || b.name === Baseline);
          return 1;
        }),
      };
    }).sort((a, b) => {
      if (a.title === b.title) {
        return 0;
      }
      if (a.title < b.title) {
        return -1;
      }
      return 1;
    });
  },
};

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    optionsDiv: {
      position: 'static',
      marginTop: theme.spacing(3),
      height: 380,
    },
    optionsButton: {
      position: 'absolute',
      bottom: theme.spacing(2),
      right: theme.spacing(2),
    }
  }),
);

const App = () => {
  const styles = useStyles();
  const [reports, setReports] = useState<Report[]>([]);
  const [groupings, setGroupings] = useState({
    active: byRun,
    inactive: byTestProfile,
  });
  const [optionsOpen, setOptionsOpen] = useState(false);

  useEffect(() => {
    getReports().then(setReports);
  }, []);

  return (
    <React.Fragment>
      <CssBaseline />
      <Container maxWidth='xl'>
        <Grid container spacing={5}>
          <Grid item sm={12} key='spacer'></Grid>
          <Grid item sm={12} xl={6} key='requests-by-latency'>
            <Paper elevation={2}>
              <ReportGrid
                sections={groupings.active.sections(reports)}
                view={RequestsByLatency}
              />
            </Paper>
          </Grid>
        </Grid>
      </Container>
      <div className={styles.optionsDiv}>
        <SpeedDial
          ariaLabel="Options"
          className={styles.optionsButton}
          icon={<SpeedDialIcon />}
          onClose={() => setOptionsOpen(false)}
          onOpen={() => setOptionsOpen(true)}
          open={optionsOpen}
        >
          <SpeedDialAction
            key='swap'
            icon={<SpeedDialIcon />}
            tooltipTitle={`Group By ${groupings.inactive.by}`}
            onClick={() => {
              setGroupings({
                active: groupings.inactive,
                inactive: groupings.active,
              });
              setOptionsOpen(false);
            }}
          />
        </SpeedDial>
      </div>
    </React.Fragment >
  );
};

export default App;
