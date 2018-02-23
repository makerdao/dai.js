import mainnetMapping from './addresses/mainnet';
import kovanMapping from './addresses/kovan';

const mapping = [
	{networkID: 1, addresses: mainnetMapping},
	{networkID: 42, addresses: kovanMapping}
]

export default mapping;
