import * as d3 from "d3";
import { group } from "d3-array"
import React, { useEffect, useState, } from "react";
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import CssBaseline from "@material-ui/core/CssBaseline";
import Container from "@material-ui/core/Container";
import Grid from "@material-ui/core/Grid";
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';

import * as fortio from "./fortio";
import ReportGrid, { Section } from './ReportGrid'
import RequestsByLatency from './RequestsByLatency'
//import LatencyByRequests from './LatencyByRequests'


const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    toolbar: {},
    title: {
      flexGrow: 1,
    },
  }),
);

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

const byProfile = {
  by: "Profile",
  sections: (reports: Report[]) => {
    const sections = group(reports, r => r.meta.name);
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
          console.assert(a.name > b.name || b.name === Baseline);
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
        showAxis: true, //i === 0,
        dimensions,
        rows: rows.map(report => {
          const name = report.meta.name;
          return { name, report };
        }).sort((a, b) => {
          if (a.name < b.name) {
            return -1;
          }
          console.assert(a.name > b.name);
          return 1;
        }),
      };
    }).sort((a, b) => {
      if (a.title === b.title) {
        return 0;
      }
      if (a.title < b.title || a.title === Baseline) {
        return -1;
      }
      console.assert(a.title > b.title || b.title === Baseline);
      return 1;
    });
  },
};

const App = () => {
  const styles = useStyles();
  const [reports, setReports] = useState<Report[]>([]);
  const [grouping, setGrouping] = useState(byRun);

  useEffect(() => {
    getReports().then(setReports);
  }, []);

  const unusedGrouping = (grouping === byRun) ? byProfile : byRun;

  return (
    <React.Fragment>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar className={styles.toolbar}>
          <Typography variant="h6" className={styles.title}>
            Proxy Latency Profile by {grouping.by}
          </Typography>
          <Button
            variant='contained'
            color='inherit'
            onClick={() => setGrouping(unusedGrouping)}
          >
            By {unusedGrouping.by}
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth='xl'>
        <Grid container spacing={2}>
          <Grid item sm={12} md={6} key='spacer'></Grid>
          <Grid item sm={12} key='requests-by-latency'>
            <ReportGrid
              sections={grouping.sections(reports)}
              view={RequestsByLatency}
            />
          </Grid>
        </Grid>
      </Container>
    </React.Fragment >
  );
};

export default App;
