import * as d3 from "d3";
import { group } from "d3-array"
import React, { useEffect, useState, } from "react";
import { createStyles, makeStyles, withStyles, Theme } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import CssBaseline from "@material-ui/core/CssBaseline";
import Container from "@material-ui/core/Container";
import Divider from "@material-ui/core/Divider";
import FormatAlignJustifyIcon from '@material-ui/icons/FormatAlignJustify';
import FormatAlignLeftIcon from '@material-ui/icons/FormatAlignLeft';
import Grid from "@material-ui/core/Grid";
import HorizontalSplitIcon from '@material-ui/icons/HorizontalSplit';
import IconButton from '@material-ui/core/IconButton';
import SvgIcon from '@material-ui/core/SvgIcon';
import Typography from '@material-ui/core/Typography';
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import Toolbar from '@material-ui/core/Toolbar';
import VerticalSplitIcon from '@material-ui/icons/VerticalSplit';

import * as fortio from "./fortio";
import ReportGrid, { Section, Dimensions } from './ReportGrid'
import RequestsByLatency from './RequestsByLatency'
//import LatencyByRequests from './LatencyByRequests'
import { ReactComponent as LinkerdIcon } from './linkerd.svg';



const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    html: {
      //width: 'calc(100% - 34px)',
    },
    toolbar: {},
    title: {
      flexGrow: 1,
    },
    paper: {
      display: 'flex',
      border: `1px solid ${theme.palette.divider}`,
      flexWrap: 'wrap',
    },
    divider: {
      alignSelf: 'stretch',
      height: 'auto',
      margin: theme.spacing(1, 0.5),
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

type Grouping = {
  by: string;
  defaultScaler: Scaler,
  sections(reports: Report[], scaler: Scaler): Section[];
};

const Baseline = "baseline";

const RowHeight = 20;

const EmptyDimensions: Dimensions & { showAxis: boolean } = {
  rowHeight: RowHeight,
  maxLatency: 0,
  maxRequests: 0,
  showAxis: false,
};

export type Scaler = {
  scale: (all: Report[]) => (section: Report[]) => Dimensions & { showAxis: boolean };
}

const AbsoluteScaler: Scaler = {
  scale: (all: Report[]) => {
    if (!all || all.length === 0) {
      return (section: Report[]) => EmptyDimensions;
    }

    const dimensions = {
      showAxis: true,
      rowHeight: RowHeight,
      maxLatency: d3.max(all, r => r.DurationHistogram.Max)!,
      maxRequests: d3.max(all, r => r.DurationHistogram.Count)!,
    };
    return (section: Report[]) => dimensions;
  },
};

const RelativeScaler: Scaler = {
  scale: (_: Report[]) => {
    return (section: Report[]) => {
      if (section.length === 0) {
        return EmptyDimensions;
      }

      return {
        showAxis: true,
        rowHeight: RowHeight,
        maxLatency: d3.max(section, r => r.DurationHistogram.Max)!,
        maxRequests: d3.max(section, r => r.DurationHistogram.Count)!,
      };
    }
  },
};

const byProfile: Grouping = {
  by: "Profile",
  defaultScaler: RelativeScaler,
  sections: (reports: Report[], scaler: Scaler) => {
    const sectionScaler = scaler.scale(reports);
    const sections = group(reports, r => r.meta.name);
    return Array.from(sections).flatMap(([title, rows]) => {
      const { showAxis, ...dimensions } = sectionScaler(rows)
      return {
        title, showAxis, dimensions,
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

const byRun: Grouping = {
  by: "Run",
  defaultScaler: AbsoluteScaler,
  sections: (reports: Report[], scaler: Scaler) => {
    const sectionScaler = scaler.scale(reports);
    const sections = group(reports, r => r.meta.run);
    return Array.from(sections).flatMap(([title, rows], i) => {
      const { showAxis, ...dimensions } = sectionScaler(rows)
      return {
        title, showAxis, dimensions,
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

const OptionsGroup = withStyles((theme) => ({
  grouped: {
    margin: theme.spacing(0.5),
    border: 'none',
    padding: theme.spacing(0, 1),
    '&:not(:first-child)': {
      borderRadius: theme.shape.borderRadius,
    },
    '&:first-child': {
      borderRadius: theme.shape.borderRadius,
    },
  },
}))(ToggleButtonGroup);

const App = () => {
  const styles = useStyles();

  const [reports, setReports] = useState<Report[]>([]);
  useEffect(() => {
    getReports().then(setReports);
  }, []);

  type State = { grouping: Grouping, scaler: Scaler };
  const [state, setState] = useState<State>({
    grouping: byProfile,
    scaler: byProfile.defaultScaler
  });

  return (
    <React.Fragment>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar className={styles.toolbar}>
          <IconButton>
            <SvgIcon component={LinkerdIcon} viewBox="0 0 600 476.6" />
          </IconButton>
          <Typography variant="h6" className={styles.title}>
            Proxy Latency by {state.grouping.by}
          </Typography>
          <OptionsGroup
            size="small"
            exclusive value={state.grouping}
            onChange={(_, g: Grouping) => {
              console.log("changing grouping", g, g.defaultScaler);
              setState({ grouping: g, scaler: g.defaultScaler });
            }}
            aria-label="Report grouping"
          >
            <ToggleButton value={byRun} aria-label="By run" disabled={byRun === state.grouping}>
              <HorizontalSplitIcon />
            </ToggleButton>
            <ToggleButton value={byProfile} aria-label="By profile" disabled={byProfile === state.grouping}>
              <VerticalSplitIcon />
            </ToggleButton>
          </OptionsGroup>
          {false && (
            <React.Fragment>
              <Divider orientation="vertical" className={styles.divider} />
              <OptionsGroup
                size="small"
                exclusive value={state.scaler}
                onChange={(_, s: Scaler) => {
                  console.log("changing scale", s);
                  setState({ grouping: state.grouping, scaler: s || state.grouping.defaultScaler });
                }}
                aria-label="Latency scale"
              >
                <ToggleButton value={AbsoluteScaler} aria-label="Absolute scale" disabled={AbsoluteScaler === state.scaler}>
                  <FormatAlignJustifyIcon />
                </ToggleButton>
                <ToggleButton value={RelativeScaler} aria-label="Relative scale" disabled={RelativeScaler === state.scaler}>
                  <FormatAlignLeftIcon />
                </ToggleButton>
              </OptionsGroup>
            </React.Fragment>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth='xl'>
        <Grid container spacing={2}>
          <Grid item sm={12} md={6} key='spacer'></Grid>
          <Grid item sm={12} key='requests-by-latency'>
            <ReportGrid
              sections={state.grouping.sections(reports, state.scaler)}
              view={RequestsByLatency}
            />
          </Grid>
        </Grid>
      </Container>
    </React.Fragment >
  );
};

export default App;
