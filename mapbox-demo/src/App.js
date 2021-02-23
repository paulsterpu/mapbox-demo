import React from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";
import SimpleCluster from "./ClusterMap/SimpleCluster";
import CustomCluster from "./ClusterMap/CustomCluster";

// Although the page does not ever refresh, notice how
// React Router keeps the URL up to date as you navigate
// through the site. This preserves the browser history,
// making sure things like the back button and bookmarks
// work properly.

export default function App() {
  return (
      <Router>
          <Switch>
            <Route exact path="/simple-cluster">
              <SimpleCluster />
            </Route>
            <Route exact path="/custom-cluster">
              <CustomCluster />
            </Route>
          </Switch>
      </Router>
  );
}