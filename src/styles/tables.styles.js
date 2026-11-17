import Colors from "../globals/colors";
import {fontStyle} from "../globals/fonts";

export default tables = {
  infoTable: {
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  infoTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  infoTableCell: {
    fontSize: 16,
    color: Colors.quaternaryColor,
    flex: 1,
    alignItems: 'flex-end',
    textAlign: 'right',
    paddingTop: 1,
    alignSelf: "center"
  },
  listItemTableCell: {
    fontSize: 16,
    alignSelf: "center",
    paddingRight: 6
  },
  infoTableHeaderCell: {
    fontSize: 16,
    color: Colors.quaternaryColor,
    ...fontStyle('black'),
  }
}
