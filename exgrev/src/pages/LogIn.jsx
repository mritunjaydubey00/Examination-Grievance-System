function LogIn() {
  function handleLogin(event) {
    event.preventDefault();
  }

  return (
    <>
      <div className="bg bg-primary text-white p-3 m-3 rounded">
        <h4>Login</h4>
        <div className="d-flex flex-column gap-2">
          <form className="row m-3">
            <label htmlFor="userId" className="col-sm-2 col-form-label ">
              User ID
            </label>
            <div className="col-sm-10">
              <input
                type="text"
                className="form-control"
                id="userId"
                placeholder="Enter your user ID"
              />
            </div>
            <label htmlFor="password" className="col-sm-2 col-form-label">
              Password
            </label>
            <div className="col-sm-10">
              <input
                type="password"
                className="form-control"
                id="password"
                placeholder="Enter your password"
              />
            </div>
          </form>
          <button
            type="submit"
            className="btn btn-success w-25 m-3 align-self-center"
            onClick={handleLogin}
          >
            Login
          </button>
        </div>
      </div>
    </>
  );
}

export default LogIn;
