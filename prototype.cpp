#include <iostream>
#include <string>
#include <vector>
#include <bits/stdc++.h>
using namespace std;
string designation[4] = {
    "Examination Controller",
    "Deputy Examination Controller",
    "Senior Faculty",
    "Junior Faculty"
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
        int id;
        int des;
    public:
        name name;
        DOB dob;
        long int phone;
        string email;

        faculty(string fname, string lname){
            this->name.fname = fname;
            this->name.lname = lname;

            cout << "~~~~~~~~~~~~~~~~~~~~~~~~~~~~"<< endl << "Faculty Onboarding Initiated" << endl << "Phone Number: ";
            cin >> phone;
            cout << "Email: ";
            cin >> email;
            cout << "What is your designation ?" << endl << "1. Examination Controller "<< endl << "2. Deputy Examination Controller " << endl << "3. Senior Faculty " << endl << "4. Junior Faculty" << endl << "Enter the corresponding number: ";
            cin >> des;
            cout << "Date of Birth (DD MM YYYY): ";
            cin >> dob.day >> dob.month >> dob.year;
            cout << "Set a password: ";
            cin >> password;
            id = phone%10000 + dob.day;
            cout << "~~~~~~~~~~~~~~~~~~~~~~~~~~~~" << endl;
            cout << "Faculty Onboarding Successful!" << endl << "User ID: " << id << endl << "Name: " << name.fname << " " << name.lname << endl << "Phone: " << phone << endl << "Email: " << email << endl << "Designation: " << designation[des-1] << endl << "DOB: " << dob.day << "/" << dob.month << "/" << dob.year << endl;
            cout << "~~~~~~~~~~~~~~~~~~~~~~~~~~~~" << endl;

        };



};

int main(){
    cout << "Welcome to the Examination Grievance System" << endl;
    int choice;
    do{
        cout << "1. Faculty Onboarding" << endl << "2. Faculty Dashboard "<< endl << "3. Student Dashboard "<< endl << "4. Exit" << endl << "Enter your choice: ";
        cin >> choice;
        switch(choice){
            case 1:
                string fname, lname;
                cout << "Enter First Name: ";
                cin >> fname;
                cout << "Enter Last Name: ";
                cin >> lname;
                faculty new_faculty(fname, lname);
                break;
            case 2:
                cout << "Faculty Dashboard" << endl;
                break;
            case 3:
                cout << "Student Dashboard" << endl;
                break;
            case 4:
                cout << "Exiting the system. Goodbye!" << endl;
                break;
            default:
                cout << "Invalid choice. Please try again." << endl;
        }while(choice != 4);

    }
}