#include <iostream>
#include <string>
#include <vector>
#include <bits/stdc++.h>
using namespace std;

string designation[6] = {
    "Examination Controller",
    "Deputy Examination Controller",
    "Senior Faculty",
    "Junior Faculty",
    "HOD",
    "Assistant Professor"
};
struct name{
    string fname;
    string lname;
};
struct DOB{
    int day;
    int month;
    int year;
};
/* Faculty class definition */
class faculty{
    private:
        string password;
        int desig;
        DOB dob;
        long int phone;
    public:
        string department;
        int id;
        name name;
        string email;

        faculty(string fname, string lname){
            this->name.fname = fname;
            this->name.lname = lname;

            cout << "~~~~~~~~~~~~~~~~~~~~~~~~~~~~"<< endl << "Faculty Onboarding Initiated"  
            << " for "<< name.fname << " " << name.lname << endl << "Phone Number: ";
            cin >> phone;
            cout << "Email: ";
            cin >> email;
            cout << "Department: ";
            cin >> department;
            cout << "What is your designation ?" << endl 
            << "1. Examination Controller "<< endl 
            << "2. Deputy Examination Controller " << endl 
            << "3. Senior Faculty " << endl 
            << "4. Junior Faculty" << endl 
            << "5. HOD" << endl 
            << "6. Assistant Professor" << endl 
            << "Enter the corresponding number: ";
            cin >> desig;
            cout << "Date of Birth (DD MM YYYY): ";
            cin >> dob.day >> dob.month >> dob.year;
            cout << "Set a password: ";
            cin >> password;
            id = phone%1000;
            insert (id, this);
            cout << "~~~~~~~~~~~~~~~~~~~~~~~~~~~~" << endl;
            cout << "Faculty Onboarding Successful!" << endl 
            << "User ID: " << id << endl 
            << "Name: " << name.fname << " " << name.lname << endl 
            << "Phone: " << phone << endl 
            << "Email: " << email << endl 
            << "Designation: " << designation[desig-1] << endl 
            << "DOB: " << dob.day << "/" << dob.month << "/" << dob.year << endl 
            << "Department: " << department << endl;
            cout << "~~~~~~~~~~~~~~~~~~~~~~~~~~~~" << endl;
        };
        friend void insert(int id, faculty *data);
        friend faculty* search(int id);
};
struct node{
    faculty *data;
    int id;
    node *next;
};
node* head  = NULL;

// Faculty Linked list to store faculty object pointers and their corresponding IDs
void insert(int id, faculty *data){
    node* newNode = new node;
    newNode->id = id;
    newNode->data = data;
    newNode->next = NULL;
    if(head == NULL){
        head = newNode;
    }
    else{
        node* temp = head;
        while(temp->next != NULL){
            temp = temp->next;
        }
        temp->next = newNode;
    }
}

faculty* search(int id){
    node* temp = head;
    while(temp != NULL){
        if(temp->id == id){
            cout << "Faculty Found: " << temp->data->name.fname << " " << temp->data->name.lname << endl;
            return temp->data;
        }
        temp = temp->next;
    }
    cout << "Faculty with ID " << id << " not found." << endl;
    return NULL;
}
int main(){
    string fname, lname;
    cout << "Enter First Name: ";
    cin >> fname;
    cout << "Enter Last Name: ";
    cin >> lname;
    faculty *newFaculty = new faculty(fname, lname);
    return 0;
}