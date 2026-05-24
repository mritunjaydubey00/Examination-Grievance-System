#include <iostream>
#include <string>
using namespace std;
const int number_of_departments = 5;
const int number_of_designations = 5;
string departments[number_of_departments] = {"Computer Science", "Mathematics", "Physics", "Chemistry", "Biology"};
string designations[number_of_designations] = {"Professor", "Associate Professor", "Assistant Professor", "Lecturer", "Instructor"};
struct name{
    string first_name;
    string last_name;
};
struct dob{
    int day;
    int month;
    int year;
};


class faculty{
    private:
        string password;
        faculty* next;
        faculty* prev;
    protected:
        string department;
        string designation;
        dob date_of_birth;
        long int phone_number;
    public:
        name faculty_name;
        int ID;
        string fEmail;

        faculty(string fname, string lname){
            faculty_name.first_name = fname;
            faculty_name.last_name = lname;
            email(0);
            phone(0);
            dob(0);
            departmentFunction(0);
            designationFunction(0);
            passwordFunction(0);
            IDfunctions(7);
        }
        void email(int work){
            while (work != 9){
                switch(work){
                    case 0:{
                        cout << "Enter the email: ";
                        cin >> fEmail;
                        work = 9;
                    }
                    case 1:{
                        cout << "Email: " << fEmail;
                        work = 9;
                    }
                    case 3:{
                        cout << "Email change menu";
                        cout << "Enter you password: ";
                        string pass;
                        cin >> pass;
                        if (pass == password){
                            work = 0;
                        }
                        else{
                            cout << "Incorrect password. Returning to menu.";
                            work = 9;
                        }
                    }
                }
            }
            return;
        }    
        bool phone(int work){
            while(work != 9){
                switch(work){
                    case 0:{
                        cout << "Enter the phone number: ";
                        cin >> phone_number;
                        work = 2;
                    }
                    case 1:{
                        cout << "Phone number: " << phone_number;
                        work = 9;
                    }
                    case 2:{
                        if (to_string(phone_number).length() != 10){
                            cout << "Invalid phone number. Please enter a 10-digit phone number: ";
                            work = 0;
                        }
                        else{
                            work = 9;
                            return true;
                        }
                        break;
                    }
                    case 3:{
                        cout << "Change Phone Number";
                        cout << "Enter you password: ";
                        string pass;
                        cin >> pass;
                        if (pass == password){
                            work = 0;
                        }
                        else{
                            cout << "Incorrect password. Returning to menu.";
                            work = 9;
                        }
                    }
            }
        }
        return false;
        }
        bool dob(int work){
            while(work != 9){
                switch(work){
                    case 0:{
                        cout << "Enter the date of birth (day month year): ";
                        cin >> date_of_birth.day >> date_of_birth.month >> date_of_birth.year;
                        work = 9;
                        return true;
                    }
                    case 1:{
                        cout << "Date of birth: " << date_of_birth.day << "/" << date_of_birth.month << "/" << date_of_birth.year;
                        work = 9;
                        return true;
                    }
                    case 2:{
                        if (date_of_birth.day < 1 || date_of_birth.day > 31 || date_of_birth.month < 1 || date_of_birth.month > 12 || date_of_birth.year < 1900 || date_of_birth.year > 2024){
                            cout << "Invalid date of birth. Please enter a valid date of birth: ";
                            work = 0;
                        }
                        else{
                            return true;
                        }
                        break;
                    }
                    case 3:{
                        cout << "Change Date of Birth ";
                        cout << "Enter you password: ";
                        string pass;
                        cin >> pass;
                        if (pass == password){
                            work = 0;
                        }
                        else{
                            cout << "Incorrect password. Returning to menu.";
                            work = 9;
                        }
                    }
                }
            }
            return false;
        }
        void departmentFunction(int work){
            while (work != 9){
                switch(work){
                    case 0:{
                        cout << "Enter the Department: ";
                        cin >> department;
                        work = 2;
                    }
                    case 1:{
                        cout << "Department: " << department;
                        work = 9;
                    }
                    case 2:{
                        for(int i = 0; i < number_of_departments; i++){
                            if (department == departments[i]){
                                work = 9;
                                break;
                            }
                            else if (i == number_of_departments - 1){
                                cout << "Invalid department. Please enter a valid department: ";
                                work = 4;
                            }
                        }
                    }
                    case 3:{
                        cout << "Department change menu";
                        cout << "Enter you password: ";
                        string pass;
                        cin >> pass;
                        if (pass == password){
                            work = 0;
                        }
                        else{
                            cout << "Incorrect password. Returning to menu.";
                            work = 9;
                        }
                    }
                    case 4:{
                        cout << "~Departments~" << endl;
                        for (int i = 0; i < number_of_departments; i++){
                            cout << i+1 << ". " << departments[i] << endl;
                        }
                        cout << endl;
                        work = 0;
                    }
                }
            }
        }
        void designationFunction(int work){
            while (work != 9){
                switch(work){
                    case 0:{
                        cout << "Enter Designation: ";
                        cin >> designation;
                        work = 2;
                    }
                    case 1:{
                        cout << "Designation: " << designation;
                        work = 9;
                    }
                    case 2:{
                        for(int i = 0; i < number_of_designations; i++){
                            if (designation == designations[i]){
                                work = 9;
                                break;
                            }
                            else if (i == number_of_designations - 1){
                                cout << "Invalid designation. Please enter a valid designation: ";
                                work = 4;
                            }
                        }
                    }
                    case 3:{
                        cout << "Designation change menu";
                        cout << "Enter you password: ";
                        string pass;
                        cin >> pass;
                        if (pass == password){
                            work = 0;
                        }
                        else{
                            cout << "Incorrect password. Returning to menu.";
                            work = 9;
                        }
                    }
                    case 4:{
                        cout << "~Designations~" << endl;
                        for (int i = 0; i < number_of_designations; i++){
                            cout << i+1 << ". " << designations[i] << endl;
                        }
                        cout << endl;
                        work = 0;
                    }
                }
            }
        }
        bool passwordFunction(int work){
            while (work != 9){
                switch(work){
                    case 0:{
                        string pass1, pass2;
                        cout << "Enter Password: ";
                        cin >> pass1;
                        cout << "Confirm Password: ";
                        cin >> pass2;
                        if (pass1 == pass2){
                            password = pass1;
                            work = 9;
                        }
                        else{
                            cout << "Passwords do not match. Please try again.";
                            work = 0;
                        }   
                    }
                    case 2:{
                        int tries = 3;
                        while (tries > 0){
                            cout << "Press Y to exit" << endl;
                            cout << "Enter your password: ";
                            string input;
                            cin >> input;
                            if (input == password){
                                cout << "Password: " << password << endl;
                                work = 9;
                            }
                            else if(input != password && input != "Y" && input != "y"){
                                cout << "INCORRECT PASSWORD" << endl;
                                tries--;
                                cout << "Tries remaining: " << tries << endl;
                                work = 2;
                            }
                            else if (input == "Y" || input == "y"){
                                cout << "Exiting password menu." << endl  ;
                                work = 9;
                            }
                            else{
                                cout << "Invalid input. Please try again." << endl;
                                tries--;
                                cout << "Tries remaining: " << tries << endl;
                                work = 2;
                            }
                        }
                    }
                    case 3:{
                        cout << "Designation change menu";
                        cout << "Enter you password: ";
                        string pass;
                        cin >> pass;
                        if (pass == password){
                            work = 0;
                        }
                        else{
                            cout << "Incorrect password. Returning to menu.";
                            work = 9;
                        }
                    }
                    case 4:{
                        cout << "~Designations~" << endl;
                        for (int i = 0; i < number_of_designations; i++){
                            cout << i+1 << ". " << designations[i] << endl;
                        }
                        cout << endl;
                        work = 0;
                    }
                    case 5:{
                        int tries = 3;
                        while (tries > 0){
                            cout << "Enter P for other autehntication methods" << endl;
                            cout << "Press Y to exit" << endl;
                            cout << "Enter your password: ";
                            string input;
                            cin >> input;
                            if (input == password){
                                cout << "Authentication Successful." << endl;
                                work = 0;
                            }
                            else if(input != password && input != "Y" && input != "y"){
                                cout << "INCORRECT PASSWORD" << endl;
                                tries--;
                                cout << "Tries remaining: " << tries << endl;
                                work = 5;
                            }
                            else if (input == "Y" || input == "y"){
                                cout << "Exiting password menu." << endl  ;
                                work = 9;
                            }
                            else if (input == "P" || input == "p"){
                                work = 6;
                            }
                            else{
                                cout << "Invalid input. Please try again." << endl;
                                tries--;
                                cout << "Tries remaining: " << tries << endl;
                                work = 5;
                            }
                        }
                        break;
                    }
                    case 6:{
                        cout << "Enter the autentication method, you would like to use: " << endl;
                        cout << "1. Phone number" << endl;
                        cout << "2. Date of Birth" << endl;
                        int method;
                        cin >> method;
                        switch(method){
                            case 1:{
                                bool K = phone(0);
                                if (K == true){
                                    cout << "Authentication Successful." << endl;
                                    work = 0;
                                }
                                else{
                                    cout << "Authentication Failed. Returning to password menu." << endl;
                                    work = 5;
                                }
                            }
                            case 2:{
                                bool K = dob(0);
                                if (K == true){
                                    cout << "Authentication Successful." << endl;
                                    work = 0;
                                }
                                else{
                                    cout << "Authentication Failed. Returning to password menu." << endl;
                                    work = 5;
                                }
                            }
                        }
                    }
                    }
                }
            return true;
            }
        bool IDfunctions(int work){
            while(work != 9){
                switch(work){
                    case 1:{
                        cout << "ID: " << ID;
                        work = 9;
                        return true;
                    }
                    case 7:{
                        int des;
                        int dep;
                        for (int i = 0; i < number_of_departments; i++){
                            if (department == departments[i]){
                                dep = i;
                                break;
                            }
                        }
                        for (int i = 0; i < number_of_designations; i++){
                            if (designation == designations[i]){
                                des = i;
                                break;
                            }
                        }
                        ID = dep*1000 + des*100 + date_of_birth.day;
                    }
                }
            }
            return false;
        }

};

int main(){
    string fname, lname;
    cout << "Enter first name: ";
    cin >> fname;
    cout << "Enter last name: ";
    cin >> lname;
    faculty f1(fname, lname);
    return 0;
}