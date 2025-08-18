import React, { useState, useEffect } from "react";
import { ToastContainer, toast } from 'react-toastify';
import { WalletConnect } from "./components/walletConnect"
import { ethers } from "ethers";
import {
  Navbar,
  Nav,
  Container,
  Table,
  Form,
  InputGroup,
  Tab,
  Row,
  Col,
} from "react-bootstrap";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function App() {
  const [coins, setCoins] = useState([]);
  const [search, setSearch] = useState("");
  const [portfolio, setPortfolio] = useState([]);
  const [currentPage , setCurrentPage] = useState(1);
  const [walletAddress , setWalletaddress] = useState(null);
  const coinsPerPage = 10;
  

  // Get balances for any chain
async function fetchPortfolio(walletAddress) {
  try {
    const covalent_api = "cqt_rQxkGWCvtqJ9gyjvtmpqChbDYwTh";
    const chains = [1 , 56 , 137 , 43114 , 250 , 42161 , 10 ]; // ETH, BSC, Polygon, Avalanche, Fantom, Arbitrum, Optimism

    let allholdings = [];

    for (let chainId in chains) {
      const res = await fetch(`https://api.covalenthq.com/v1/${chainId}/address/${walletAddress}/balances_v2/?key=${covalent_api}`);
      const data = await res.json();

      if (data?.data?.items) {
        allholdings = [...allholdings , ...data.data.items];
      }
    }
    return allholdings;
  } catch (error) {
      console.error("Error Fetching Portfolio:" , error);
      return [];
    }
};


const handleWalletConnect = async (walletAddress) => {
  const holdings = await fetchPortfolio(walletAddress);
  setPortfolio(holdings);
}


  useEffect(() => {
    fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd"
    )
      .then((res) => res.json())
      .then((data) => setCoins(data))
      .catch((err) => console.error(err));
  }, []);

  // const addToPortfolio = (coin) => {
  //   if (!portfolio.find((c) => c.id === coin.id)) {
  //     setPortfolio((prev) => [...prev, coin]);
  //   }
  //   toast.success("Added Successfully!")
  // };

  const filteredCoins = coins.filter((coin) =>
    coin.name.toLowerCase().includes(search.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination logic
  const indexOfLastCoin = currentPage * coinsPerPage;
  const indexOfFirstCoin = indexOfLastCoin - coinsPerPage;
  const currentCoins =  filteredCoins.slice(indexOfFirstCoin, indexOfLastCoin);
  const totalPages = Math.ceil(filteredCoins.length / coinsPerPage);

  return (
    <>
      {/* Navbar */}
      <Navbar bg="" expand="sm" className="mb-4 text-center" style={{ backgroundColor:'blueviolet', textAlign: 'center',height: 100}}>
        <Container>
          <Navbar.Brand href="/">Coinlytics</Navbar.Brand>
          {/* <Navbar.Toggle /> */}
          <Navbar.Collapse>
            <Nav className="ms-auto" style={{}}>
              <InputGroup className="mb-3 rounded-pill" style={{}}>
                    <Form.Control
                      placeholder="🔍 Search coins..."
                      onChange={(e) => setSearch(e.target.value)} 
                      style={{textAlign: "left"}}
                    />
                    <InputGroup.Text>
                      <i className="bi bi-search rounded-pill"></i>
                    </InputGroup.Text>
                  </InputGroup>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container>
        <Tab.Container defaultActiveKey="market">
          <Row>
            <Col>
              <Nav variant="pills" className="mb-4" style={{textAlign: 'center'}}>
                <Nav.Item>
                  <Nav.Link eventKey="market">Market</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="portfolio">Portfolio</Nav.Link>
                </Nav.Item>
              </Nav>

              <Tab.Content>

                {/* Market Tab */}
                <Tab.Pane eventKey="market" >
                  

                  <Table striped bordered hover responsive variant="dark">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Coin</th>
                        <th>Price</th>
                        <th>24h Change</th>
                        <th>Market Cap</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentCoins.map((coin, index) => (
                        <tr key={coin.id}>
                          <td>{indexOfFirstCoin + index + 1}</td>
                          <td>
                            <img
                              src={coin.image}
                              alt={coin.name}
                              style={{ width: "25px", marginRight: "10px" }}
                            />
                            {coin.name}
                          </td>
                          <td>${coin.current_price.toLocaleString()}</td>
                          <td
                            style={{
                              color:
                                coin.price_change_percentage_24h > 0
                                  ? "limegreen"
                                  : "red",
                            }}
                          >
                            {coin.price_change_percentage_24h.toFixed(2)}%
                          </td>
                          <td>${coin.market_cap.toLocaleString()}</td>
                          <td>
                            <button
                              className="btn btn-success btn-sm rounded-pill"
                              onClick={() => addToPortfolio(coin)}
                            >
                              Add
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  <div className="d-flex justify-content-center mt-4">
        <button
          className="btn btn-outline-primary mx-2"
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          ◀ Previous
        </button>
        <span className="align-self-center">
          Page {currentPage} of {totalPages}
        </span>
        <button
          className="btn btn-outline-primary mx-2"
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          Next ▶
        </button>
      </div>
                </Tab.Pane>
                <WalletConnect onWalletConnected={handleWalletConnect} />
                {/* Portfolio Tab */}
                <Tab.Pane eventKey="portfolio">
                  <h4>Your Portfolio</h4>
                   {portfolio.length > 0 ? (
        <table className="table table-dark table-striped mt-3 rounded">
          <thead>
            <tr>
              <th>#</th>
              <th>Token</th>
              <th>Symbol</th>
              <th>Balance</th>
              <th>Value (USD)</th>
            </tr>
          </thead>
          <tbody>
            {portfolio.map((token, index) => (
              <tr key={token.contract_address}>
                <td>{index + 1}</td>
                <td>{token.contract_name || "Unknown"}</td>
                <td>{token.contract_ticker_symbol}</td>
                <td>
                  {(Number(token.balance) / Math.pow(10, token.contract_decimals)).toFixed(4)}
                </td>
                <td>${token.quote ? token.quote.toFixed(2) : 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mt-3">No tokens found in your wallet.</p>
      )}

                  {/* Example Chart */}
                  {portfolio.length > 0 && (
                    <div style={{ height: 300 , color: 'darkcyan' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={portfolio.map((coin) => ({
                            name: coin.symbol.toUpperCase(),
                            price: coin.current_price,
                          }))}
                        >
                          <XAxis dataKey="name" />
                          <YAxis className="axis" style={{backgroundcolor: 'darkcyan'}} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="price"
                            stroke="cyan"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </Tab.Pane>
              </Tab.Content>
            </Col>
          </Row>
        </Tab.Container>
        <ToastContainer position="top-right" autoClose={3000} />
      </Container>
    </>
  );
}

export default App;
