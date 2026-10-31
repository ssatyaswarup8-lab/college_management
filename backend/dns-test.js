import dns from 'node:dns';

dns.setServers(['10.228.50.137']);

console.log('DNS servers:', dns.getServers());

dns.resolveSrv(
  '_mongodb._tcp.cluster0.aw2ympy.mongodb.net',
  (error, records) => {
    if (error) {
      console.error('DNS error:', error.code, error.message);
      return;
    }

    console.log('DNS SUCCESS');
    console.log(records);
  }
);