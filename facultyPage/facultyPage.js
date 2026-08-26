let complaintData = {
  title: "Complaint Title",
  description: "Complaint Description",
  tags: ["Tag1", "Tag2", "Tag3"],
  status: "Pending",
  date: "2023-08-15",
};

document.getElementsByClassName("card-title").value = complaintData.title;

document.getElementsByClassName("card-text").value = complaintData.description;

document.getElementsByClassName("card-text").value = complaintData.tags.