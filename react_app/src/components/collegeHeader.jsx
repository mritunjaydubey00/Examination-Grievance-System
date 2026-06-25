import styles from "./collegeHeader.module.css";
function CollegeHeader() {
  return (
    <>
      <section className={styles.CollegeHeader}>
        <div className={styles.CollegeHeaderDiv}>
          <img
            href="https://mitsgwalior.in/img/newsite-logo1.png"
            alt="mits-logo"
          ></img>
        </div>
        <div>
          <h1 className={styles.collegename}>
            MADHAV INSITUTE OF TECHNOLOGY & SCIENCE, GWALIOR
          </h1>
        </div>
      </section>
    </>
  );
}

export default CollegeHeader;
