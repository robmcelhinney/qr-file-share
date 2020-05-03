import React from 'react';
import {Files} from './Files';
import {Upload} from './Upload';

class App extends React.Component {

	render() {
		return (
			<div className={"App bg-white rounded-lg p-6"}>
				<div id={"mainContent"}>
					<Upload />
					<Files />
				</div>
			</div>
		);
	}
}

export default App;