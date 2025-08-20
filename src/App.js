import React, { useState, useEffect } from "react";
import { ToastContainer, toast } from 'react-toastify';
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
  const [Tokens , setTokens] = useState([]);
  const coinsPerPage = 10;

  // Load from localStorage when app starts
  useEffect(() => {
    const saved = localStorage.getItem("portfolioTokens");
    if (saved) {
      setPortfolio(JSON.parse(saved));
    }
  }, []);

  // Save to localStorage whenever portfolio changes
  useEffect(() => {
    localStorage.setItem("portfolioTokens", JSON.stringify(portfolio));
  }, [portfolio]);

  useEffect(() => {
    fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd"
    )
      .then((res) => res.json())
      .then((data) => setCoins(data))
      .catch((err) => console.error(err));
  }, []);

  const addToPortfolio = (coin) => {
    if (!portfolio.find((c) => c.id === coin.id)) {
      setPortfolio((prev) => [...prev, coin]);
    }
    toast.success("Added Successfully!")
  };

  const removefromPortfolio = (index) => {
    const removetoken = portfolio.filter((_, i) => i !== index);
    setPortfolio(removetoken);
    toast.success("Token Removed Successfully!");
  }

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
          <div class="logo"></div>
          <Navbar.Brand href="/"  style={{color:"gold"}}>Coinlytics</Navbar.Brand>
          {/* <Navbar.Toggle /> */}
          <Navbar.Collapse>
            <Nav className="ms-auto" style={{}}>
              <InputGroup className="mb-3 rounded-pill" style={{}}>
                    <Form.Control
                      type="search" 
                      id="search"
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
              <Nav variant="pills" className="mb-4" >
                <Nav.Item>
                  <Nav.Link eventKey="market" style={{color: "black"}}>Market</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="portfolio" style={{color: "black"}}>Portfolio</Nav.Link>
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
                {/* Portfolio Tab */}
                <Tab.Pane eventKey="portfolio">
                  <Table striped bordered hover responsive variant="dark">
                  <h4>Your Portfolio</h4>
                   {portfolio && portfolio.length > 0 ? (
        <table className="table table-dark table-striped mt-3 rounded">
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
            {portfolio.map((token, index) => (
              <tr key={index + 1}>
                <td>{index+1}</td>
                <td>
                <td><img
                  src={token.image}
                  alt={token.name}
                  style={{ width: "25px", marginRight: "10px" }}
                />
                </td>
                {token.name}
              </td>
              <td>${token.current_price.toLocaleString()}</td>
              <td
                style={{
                   color:
                    token.price_change_percentage_24h > 0
                      ? "limegreen"
                      : "red",
                }}
              >
                {token.price_change_percentage_24h.toFixed(2)}%
              </td>
              <td>${token.market_cap.toLocaleString()}</td>
               <td>
                            <button
                              className="btn btn-success btn-sm rounded-pill"
                              onClick={() => removefromPortfolio(index)}
                            >
                              Remove
                            </button>
                          </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mt-3">No tokens found in your portfolio.</p>
      )}
      </Table>

                  {/* Chart */}
                  {portfolio.length > 0 && (
                    <div style={{ height: 300 , color: 'darkcyan' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={portfolio.map((coin) => ({
                            name: coin.symbol ? coin.symbol.toUpperCase() : "N/A",
                            price: coin.current_price,
                          }))}
                        >
                          <XAxis dataKey="name" stroke="black"  tick={{ fill: "white" }} />
                          <YAxis className="axis" stroke="black" tick={{ fill: "white" }} />
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
