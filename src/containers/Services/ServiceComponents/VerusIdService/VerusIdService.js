import React, { Component } from "react"
import { connect } from 'react-redux'
import { setServiceLoading } from "../../../../actions/actionCreators";
import { createAlert } from "../../../../actions/actions/alert/dispatchers/alert";
import { requestServiceStoredData } from "../../../../utils/auth/authBox";
import { VERUSID_SERVICE_ID } from "../../../../utils/constants/services";
import { VerusIdServiceRender } from "./VerusIdService.render";

class VerusIdService extends Component {
  constructor(props) {
    super(props);
    this.state = {
      linkedIds: null,
    };

    this.props.navigation.setOptions({title: 'VerusID'});
  }

  async getLinkedIds() {
    this.props.dispatch(setServiceLoading(true, VERUSID_SERVICE_ID));

    try {
      const verusIdServiceData = await requestServiceStoredData(
        VERUSID_SERVICE_ID,
      );
      
      if (verusIdServiceData.linked_ids) {
        this.setState({
          linkedIds: verusIdServiceData.linked_ids,
        });
      } else {
        this.setState({
          linkedIds: {},
        });
      }
    } catch (e) {
      createAlert('Error Loading Linked VerusIDs', e.message);
    }

    this.props.dispatch(setServiceLoading(false, VERUSID_SERVICE_ID));
  }

  componentDidMount() {
    this.getLinkedIds();
  }

  render() {
    return VerusIdServiceRender.call(this);
  }
}

const mapStateToProps = state => {
  return {
    loading: state.services.loading[VERUSID_SERVICE_ID],
  };
};

export default connect(mapStateToProps)(VerusIdService);