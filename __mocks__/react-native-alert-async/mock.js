let AsyncAlerts = []
let AlertResponse = false

function mockRnAlertAsync() {
  return {
    AlertAsync: (title, desc, buttons, options) => {
      AsyncAlerts.push({title, desc, buttons, options})
      return new Promise((resolve) => {
        resolve(AlertResponse)
      })
    },
    getAlerts: () => AsyncAlerts,
    setAlertResponse: (response) => {
      AlertResponse = response
    }
  } 
}

module.exports = mockRnAlertAsync