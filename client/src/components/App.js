import React from 'react'
import {Files} from './Files'
import {FileUpload} from './FileUpload'

class App extends React.Component {

	render() {
		return (
			<div className={"App bg-white rounded-lg p-6"}>
				<div id={"mainContent"}>
					<FileUpload />
					<Files />
				</div>
			</div>
		)
	}
}

export default App