#include <iostream>
#include <string>
#include <fstream>
using namespace std;

string problemTag[] = {"Problem_1", "Problem_2", "Problem_3"};

const int number_of_departments = 5;
const int number_of_designations = 5;

string departments[number_of_departments] = {"Computer Science", "Mathematics", "Physics", "Chemistry", "Biology"};
string designations[number_of_designations] = {"Professor", "Associate Professor", "Assistant Professor", "Lecturer", "Instructor"};

//Linked list creation 
// Renamed structs to avoid collision with function names
struct UserName {
    string first_name;
    string last_name;
};
struct DateOfBirth {
    int day;
    int month;
    int year;
};


class student {
        private:
            string password;
        protected:
            int department  = -1;
            DateOfBirth date_of_birth;
            long int phone_number;
        public:
            UserName student_name;
            string ID;
            string sEmail;
            student* next = NULL;
            student* prev = NULL;

        int email(int e) {
            while (e != 9) {
                switch(e) {
                    case 0: {
                        cout << "Enter the email: ";
                        cin >> sEmail;
                        return 9;
                        break;
                    }
                    case 1: {
                        cout << "Email: " << sEmail << endl;
                        return 9;
                        break;
                    }
                    case 3: {
                        cout << "--- Email Change Menu ---" << endl;
                        cout << "Enter your password: ";
                        string pass;
                        cin >> pass;
                        if (pass == password) {
                            return 0;
                        } else {
                            cout << "Incorrect password. Returning to menu." << endl;
                            return 9;
                        }
                        break;
                    }
                    default:
                        return 9;
                        break;
                }
            }
        }    

        int phone(int p) {
            while(p != 9) {
                switch(p) {
                    case 0: {
                        cout << "Enter the phone number: ";
                        cin >> phone_number;
                        cin.ignore();
                        return 2;
                        break;
                    }
                    case 1: {
                        cout << "Phone number: " << phone_number << endl;
                        return 9;
                        break;
                    }
                    case 2: {
                        if (to_string(phone_number).length() != 10) {
                            cout << "Invalid phone number. ";
                            return 0;
                        } else {
                            return 9;
                        }
                        break;
                    }
                    case 3: {
                        cout << "--- Change Phone Number ---" << endl;
                        cout << "Enter your password: ";
                        string pass;
                        cin >> pass;
                        if (pass == password) {
                            return 0;
                        } else {
                            cout << "Incorrect password. Returning to menu." << endl;
                            return 9;
                        }
                        break;
                    }
                    default:
                        p = 9;
                        break;
                }
            }
            return 9;
        }

        int dobFunction(int d) {
            while(d != 9) {
                switch(d) {
                    case 0: {
                        cout << "Enter the date of birth (day month year): ";
                        cin >> date_of_birth.day >> date_of_birth.month >> date_of_birth.year;
                        cin.ignore();
                        return 2; // Pass to validation
                        break;
                    }
                    case 1: {
                        cout << "Date of birth: " << date_of_birth.day << "/" << date_of_birth.month << "/" << date_of_birth.year << endl;
                        return 9;
                        break;
                    }
                    case 2: {
                        if (date_of_birth.day < 1 || date_of_birth.day > 31 || date_of_birth.month < 1 || date_of_birth.month > 12 || date_of_birth.year < 1900 || date_of_birth.year > 2026) {
                            cout << "Invalid date of birth. Please re-enter." << endl;
                            return 0;
                        } else {
                            return 9;
                        }
                        break;
                    }
                    case 3: {
                        cout << "--- Change Date of Birth ---" << endl;
                        cout << "Enter your password: ";
                        string pass;
                        cin >> pass;
                        if (pass == password) {
                            return 0;
                        } else {
                            cout << "Incorrect password. Returning to menu." << endl;
                            return 9;
                        }
                        break;
                    }
                    default:
                        return 9;
                        break;
                }
            }
            return 9;
        }

        int departmentFunction(int df) {
            while (df != 9) {
                switch(df) {
                    case 0: {
                        cout << "Enter the department number: ";
                        cin >> department;
                        department--; // Adjusting for 0-based index
                        return 2;
                    }
                    case 1: {
                        cout << "Department: " << departments[department] << endl;
                        return 1;
                        break;
                    }
                    case 2: {
                        if (department >= 0 && department < number_of_departments) {
                            return 9;
                        }
                        else{
                            cout << "Invalid department selected." << endl;
                            return 4; // Show options list
                        }
                        break;
                    }
                    case 3: {
                        cout << "--- Department Change Menu ---" << endl;
                        cout << "Enter your password: ";
                        string pass;
                        cin >> pass;
                        if (pass == password) {
                            return 0;
                        } else {
                            cout << "Incorrect password. Returning to menu." << endl;
                            return 9;
                        }
                        break;
                    }
                    case 4: {
                        cout << "\n~ Available Departments ~" << endl;
                        for (int i = 0; i < number_of_departments; i++) {
                            cout << i+1 << ". " << departments[i] << endl;
                        }
                        cout << endl;
                        return 0; // Ask user for input again
                        break;
                    }
                    default:
                        return 9;
                        break;
                }
            }
        }
        int passwordFunction(int pf) {
            while (pf != 9) {
                switch(pf) {
                    case 0: {
                        string pass1, pass2;
                        cout << "Enter Password: ";
                        cin >> pass1;
                        cout << "Confirm Password: ";
                        cin >> pass2;
                        if (pass1 == pass2) {
                            password = pass1;
                            return 1;
                        } else {
                            cout << "Passwords do not match. Please try again." << endl;
                            return 0;
                        }   
                        break;
                    }
                    case 2: {
                        int tries = 3;
                        while (tries > 0) {
                            cout << "Press Y to exit" << endl;
                            cout << "Enter your password: ";
                            string input;
                            cin >> input;
                            if (input == password) {
                                cout << "Password Verified." << endl;
                                return 1;
                            } else if (input == "Y" || input == "y") {
                                cout << "Exiting verification menu." << endl;
                                return 0;
                            } else {
                                cout << "INCORRECT PASSWORD" << endl;
                                tries--;
                                cout << "Tries remaining: " << tries << endl;
                            }
                        }
                        if (tries == 0) return 0;
                        break;
                    }
                    default:
                        return 0;
                        break;
                }
            }
            return 9;
        }

        int IDfunctions(int idf) {
            while(idf != 9) {
                switch(idf) {
                    case 0:{
                        cout << "Enter your student ID: ";
                        cin >> ID;
                        return 2;
                        break;
                    }
                    case 1: {
                        cout << "ID: " << ID << endl;
                        return 9;
                    }
                    case 2:{
                        if (ID.length() != 11){
                            cout << "Invalid ID format. Please enter an 11-digit ID." << endl;
                            return 0;
                        } else {
                            return 9;
                        }
                    }
                    default:
                        return 9;
                        break;
                }
            }
            return 9;
        }

        //constructor to initialize student data
        student(string fname, string lname) {
            student_name.first_name = fname;
            student_name.last_name = lname;
            int next = 404;
            for (int i = 0; i < 6; i++) {
                switch(i){
                    case 0:{
                        next = 0;
                        while (next != 9) {
                            next = email(next);
                        }
                        break;
                    }
                    case 1: {
                        next = 0;
                        while (next != 9) {
                            next = phone(next);
                        }
                        break;
                    }
                    case 2: {
                        next = 0;
                        while (next != 9) {
                            next = dobFunction(next);
                        }
                        break;
                    }
                    case 3: {
                        next = 4;
                        while (next != 9) {
                            next = departmentFunction(next);
                        }
                        break;
                    }
                    case 4: {
                        next = 0;
                        while (next != 9) {
                            next = passwordFunction(next);
                        }
                        break;
                    }
                    case 5: {
                        next = 0;
                        while (next != 9) {
                            next = IDfunctions(next);
                        }
                        break;
                    }
                }
            }
        }
        friend int insertAtHead(string fname, string lname, int command);
        friend student * searchStudent(string Id);
        friend int deleteStudent(string Id);
};
class faculty {
    private:
        string password;
    protected:
        int department  = -1;
        int  designation = -1 ;
        DateOfBirth date_of_birth;
        long int phone_number;
    public:
        UserName faculty_name;
        int ID;
        string fEmail;
        faculty* next = NULL;
        faculty* prev = NULL;

        int email(int e) {
            while (e != 9) {
                switch(e) {
                    case 0: {
                        cout << "Enter the email: ";
                        cin >> fEmail;
                        return 9;
                        break;
                    }
                    case 1: {
                        cout << "Email: " << fEmail << endl;
                        return 9;
                        break;
                    }
                    case 3: {
                        cout << "--- Email Change Menu ---" << endl;
                        cout << "Enter your password: ";
                        string pass;
                        cin >> pass;
                        if (pass == password) {
                            return 0;
                        } else {
                            cout << "Incorrect password. Returning to menu." << endl;
                            return 9;
                        }
                        break;
                    }
                    default:
                        return 9;
                        break;
                }
            }
        }    

        int phone(int p) {
            while(p != 9) {
                switch(p) {
                    case 0: {
                        cout << "Enter the phone number: ";
                        cin >> phone_number;
                        cin.ignore();
                        return 2;
                        break;
                    }
                    case 1: {
                        cout << "Phone number: " << phone_number << endl;
                        return 9;
                        break;
                    }
                    case 2: {
                        if (to_string(phone_number).length() != 10) {
                            cout << "Invalid phone number. ";
                            return 0;
                        } else {
                            return 9;
                        }
                        break;
                    }
                    case 3: {
                        cout << "--- Change Phone Number ---" << endl;
                        cout << "Enter your password: ";
                        string pass;
                        cin >> pass;
                        if (pass == password) {
                            return 0;
                        } else {
                            cout << "Incorrect password. Returning to menu." << endl;
                            return 9;
                        }
                        break;
                    }
                    default:
                        p = 9;
                        break;
                }
            }
            return 9;
        }

        int dobFunction(int d) {
            while(d != 9) {
                switch(d) {
                    case 0: {
                        cout << "Enter the date of birth (day month year): ";
                        cin >> date_of_birth.day >> date_of_birth.month >> date_of_birth.year;
                        cin.ignore();
                        return 2; // Pass to validation
                        break;
                    }
                    case 1: {
                        cout << "Date of birth: " << date_of_birth.day << "/" << date_of_birth.month << "/" << date_of_birth.year << endl;
                        return 9;
                        break;
                    }
                    case 2: {
                        if (date_of_birth.day < 1 || date_of_birth.day > 31 || date_of_birth.month < 1 || date_of_birth.month > 12 || date_of_birth.year < 1900 || date_of_birth.year > 2026) {
                            cout << "Invalid date of birth. Please re-enter." << endl;
                            return 0;
                        } else {
                            return 9;
                        }
                        break;
                    }
                    case 3: {
                        cout << "--- Change Date of Birth ---" << endl;
                        cout << "Enter your password: ";
                        string pass;
                        cin >> pass;
                        if (pass == password) {
                            return 0;
                        } else {
                            cout << "Incorrect password. Returning to menu." << endl;
                            return 9;
                        }
                        break;
                    }
                    default:
                        return 9;
                        break;
                }
            }
            return 9;
        }

        int departmentFunction(int df) {
            while (df != 9) {
                switch(df) {
                    case 0: {
                        cout << "Enter the department number: ";
                        cin >> department;
                        department--; // Adjusting for 0-based index
                        return 2;
                    }
                    case 1: {
                        cout << "Department: " << departments[department] << endl;
                        return 1;
                        break;
                    }
                    case 2: {
                        if (department >= 0 && department < number_of_departments) {
                            return 9;
                        }
                        else{
                            cout << "Invalid department selected." << endl;
                            return 4; // Show options list
                        }
                        break;
                    }
                    case 3: {
                        cout << "--- Department Change Menu ---" << endl;
                        cout << "Enter your password: ";
                        string pass;
                        cin >> pass;
                        if (pass == password) {
                            return 0;
                        } else {
                            cout << "Incorrect password. Returning to menu." << endl;
                            return 9;
                        }
                        break;
                    }
                    case 4: {
                        cout << "\n~ Available Departments ~" << endl;
                        for (int i = 0; i < number_of_departments; i++) {
                            cout << i+1 << ". " << departments[i] << endl;
                        }
                        cout << endl;
                        return 0; // Ask user for input again
                        break;
                    }
                    default:
                        return 9;
                        break;
                }
            }
        }

        int designationFunction(int def) {
            while (def != 9) {
                switch(def) {
                    case 0: {
                        cout << "Enter the designation number: ";
                        cin >> designation;
                        designation--; // Adjusting for 0-based index
                        return 2;
                    }
                    case 1: {
                        cout << "Designation: " << designations[designation] << endl;
                        return 9;
                        break;
                    }
                    case 2: {
                        if (designation >= 0 && designation < number_of_designations) {
                            return 9;
                        }
                        else{
                            cout << "Invalid designation selected." << endl;
                            return 4; // Show options list
                        }
                        break;
                    }
                    case 3: {
                        cout << "--- Designation Change Menu ---" << endl;
                        cout << "Enter your password: ";
                        string pass;
                        cin >> pass;
                        if (pass == password) {
                            return 0;
                        } else {
                            cout << "Incorrect password. Returning to menu." << endl;
                            return 9;
                        }
                        break;
                    }
                    case 4: {
                        cout << "\n~ Available Designations ~" << endl;
                        for (int i = 0; i < number_of_designations; i++) {
                            cout << i+1 << ". " << designations[i] << endl;
                        }
                        cout << endl;
                        return 0; // Ask user for input again
                        break;
                    }
                    default:
                        return 9;
                        break;
                }
            }
        }

        int passwordFunction(int pf) {
            while (pf != 9) {
                switch(pf) {
                    case 0: {
                        string pass1, pass2;
                        cout << "Enter Password: ";
                        cin >> pass1;
                        cout << "Confirm Password: ";
                        cin >> pass2;
                        if (pass1 == pass2) {
                            password = pass1;
                            
                            return 9;
                        } else {
                            cout << "Passwords do not match. Please try again." << endl;
                            return 0;
                        }   
                        break;
                    }
                    case 2: {
                        int tries = 3;
                        while (tries > 0) {
                            cout << "Press Y to exit" << endl;
                            cout << "Enter your password: ";
                            string input;
                            cin >> input;
                            if (input == password) {
                                cout << "Password Verified." << endl;
                                return 0;
                            } else if (input == "Y" || input == "y") {
                                cout << "Exiting verification menu." << endl;
                                return 1;
                            } else {
                                cout << "INCORRECT PASSWORD" << endl;
                                tries--;
                                cout << "Tries remaining: " << tries << endl;
                            }
                        }
                        if (tries == 0) return 9;
                        break;
                    }
                    default:
                        return 9;
                        break;
                }
            }
            return 9;
        }

        int IDfunctions(int idf) {
            while(idf != 9) {
                switch(idf) {
                    case 1: {
                        cout << "ID: " << ID << endl;
                        return 9;
                    }

                    case 7: {
                        ID = department * 1000 + designation * 100 + date_of_birth.day;
                        cout << "Generated ExGrev ID: " << ID << endl;
                        cout << "Please remember this ID for future reference." << endl;
                        idf = 9;
                        return 9;
                    }
                    default:
                        return 9;
                        break;
                }
            }
            return 9;
        }

        void display(){
            cout << "Name: " << faculty_name.first_name << faculty_name.last_name << endl;
            departmentFunction(1);
            designationFunction(1);
            email(1);
            phone(1);
            IDfunctions(1);
        }
        faculty(string fname, string lname) {
            faculty_name.first_name = fname;
            faculty_name.last_name = lname;
            int next = 404;
            for (int i = 0; i < 7; i++) {
                switch(i){
                    case 0:{
                        next = 0;
                        while (next != 9) {
                            next = email(next);
                        }
                        break;
                    }
                    case 1: {
                        next = 0;
                        while (next != 9) {
                            next = phone(next);
                        }
                        break;
                    }
                    case 2: {
                        next = 0;
                        while (next != 9) {
                            next = dobFunction(next);
                        }
                        break;
                    }
                    case 3: {
                        next = 4;
                        while (next != 9) {
                            next = departmentFunction(next);
                        }
                        break;
                    }
                    case 4: {
                        next = 4;
                        while (next != 9) {
                            next = designationFunction(next);
                        }
                        break;
                    }
                    case 5: {
                        next = 0;
                        while (next != 9) {
                            next = passwordFunction(next);
                        }
                        break;
                    }
                    case 6: {
                        next = 7;
                        while (next != 9) {
                            next = IDfunctions(next);
                        }
                        break;
                    }
                }
            }
        }
        friend int insertAtHead(string fname, string lname, int command);
        friend faculty * searchFaculty(int id);
        friend int deleteFaculty(int Id);
};
faculty * fHead = NULL;
student * sHead = NULL;

faculty * searchFaculty(int Id){
    faculty * temp = fHead;
    while(temp->next != NULL){
        if(temp->ID == Id){
            return temp;
        }
        else{
            temp = temp->next;
        }
    }
    cout << "No faculty of Entered ID found" << endl;
    faculty * none = NULL;
    return none;
}

student * searchStudent(string Id){
    student * temp = sHead;
    while(temp->next != NULL){
        if (temp->ID == Id)
        {
            return temp;
        }
        else{
            temp = temp->next;
        }
    }
    cout << "No student found in records" << endl;
    student * none = NULL;
    return none;
}

int deleteFaculty(int Id){
    cout << "Enter Password: ";
    string pass;
    cin >> pass;
    faculty * toDelete;
    toDelete = searchFaculty(Id);
    if(pass != toDelete->password){
        cout << "Password Incorect" << endl;
        return 0;
    }
    int command = 0;
    if(toDelete->next == NULL && toDelete->prev != NULL){
        command = 1; // Node is the last node in linked list
    }
    else if(toDelete ->next != NULL && toDelete->prev != NULL){
        command = 2; // Node is a middle node in linked list
    }
    else if(toDelete->next != NULL && toDelete->prev == NULL){
        command = 3; //Node is the head node in linked list
    }
    switch (command)
    {
    case 1:{
        toDelete->prev->next = NULL;
        delete toDelete;
        toDelete = NULL;
        return 1;
    }
    case 2:{
        toDelete->prev->next = toDelete->next;
        toDelete->next->prev = toDelete->prev;
        delete toDelete;
        toDelete = NULL;
        return 2;
    }
    case 3:{
        toDelete->next->prev = NULL;
        delete toDelete;
        toDelete = NULL;
        return 3;
    }
    }
}

int deleteStudent(string Id){
    cout << "Enter Password: ";
    string pass;
    cin >> pass;
    student * toDelete;
    toDelete = searchStudent(Id);
    if(pass != toDelete->password){
        cout << "Password Incorect" << endl;
        return 0;
    }
    int command = 0;
    if(toDelete->next == NULL && toDelete->prev != NULL){
        command = 1; // Node is the last node in linked list
    }
    else if(toDelete ->next != NULL && toDelete->prev != NULL){
        command = 2; // Node is a middle node in linked list
    }
    else if(toDelete->next != NULL && toDelete->prev == NULL){
        command = 3; //Node is the head node in linked list
    }
    switch (command)
    {
    case 1:{
        toDelete->prev->next = NULL;
        delete toDelete;
        toDelete = NULL;
        return 1;
    }
    case 2:{
        toDelete->prev->next = toDelete->next;
        toDelete->next->prev = toDelete->prev;
        delete toDelete;
        toDelete = NULL;
        return 2;
    }
    case 3:{
        toDelete->next->prev = NULL;
        delete toDelete;
        toDelete = NULL;
        return 3;
    }
    }
}

int insertAtHead(string fname, string lname, int command) {
    switch(command){
        case 1:{
            faculty * newFaculty = new faculty(fname, lname);
            if (fHead == NULL){
                newFaculty->prev = NULL;
                newFaculty->next = NULL;
                fHead = newFaculty;
                cout << "Faculty Onboarded !" << endl;
                return 11;
            }
            else{
                newFaculty->next = fHead;
                newFaculty->prev = NULL;
                fHead->prev = newFaculty;
                fHead = newFaculty;
                cout << "Faculty Onboarded !" << endl;
                return 12;
            }
            return 10;
        }
        case 2:{
            student * newStudent = new student(fname, lname);
            if(sHead == NULL){
                newStudent->prev = NULL;
                newStudent->next = NULL;
                sHead = newStudent;
                return 21;
            }
            else{
                newStudent->next = sHead;
                newStudent->prev = NULL;
                sHead->prev = newStudent;
                sHead = newStudent;
                return 22;
            }
            return 20;
        }
    }
}

int signUp(){
    int choice;
    string fname, lname;
    cout << "1. Faculty Sign-up" << endl << "2. Student Sign-up"<< endl;
    cin >> choice;
    cout << "Enter First name: ";
    cin >> fname;
    cout << "Enter last Name: "; cin >> lname;
    insertAtHead(fname, lname, choice);
    return 0;
}

int logIn(){
    int choice;
    cout << "1. Faculty Sign-up" << endl << "2. Student Sign-up"<< endl;
    cin >> choice;
    switch(choice){
        case 1: {
            cout << "Faculty Login" << endl;
            int input;
            cout << "Please enter your ID: ";
            cin >> input;
            faculty * thisFaculty = searchFaculty(input);
            int listenCall = thisFaculty->passwordFunction(2);
            if(listenCall == 0){
                cout << "Login Successful" << endl;
                return 0;
            }
            return 1;
        }
        case 2:{
            cout << "Faculty Login" << endl;
            string inputValue;
            cout << "Please enter your ID: ";
            cin >> inputValue;
            student * thisStudent = searchStudent(inputValue);
            int listenCall = thisStudent->passwordFunction(2);
            if(listenCall == 0){
                cout << "Login Successful" << endl;
                return 0;
            }
            return 1;
        }
    }
}

int showList(int choice){
    switch (choice)
    {
        case 1:{
            cout << "All Faculties" << endl;
            faculty* temp = fHead;
            if(fHead == NULL){
                cout << "No Faculties added" << endl;
                return 1;
            }
            int user = 1;
            while(temp != NULL){
                cout << user << ". " << temp->ID << endl;
                temp = temp->next;
                user++;
            }
            break;
        }
        case 2:{
            cout << "All Students" << endl;
            student* temp = sHead;
            if(sHead == NULL){
                cout << "No Students added" << endl;
                return 1;
            }
            int user = 1;
            while(temp != NULL){
                cout << user << ". " << temp->ID << endl;
                temp = temp->next;
                user++;
            }
            break;
        }
    }
}

void print(){
    for(int num = 10; num > -1 ; num--){
        cout << "~";
        if(num ==  5){
            cout << "ExGrev";
        }
    }
    cout << endl;
    return;
} 
int main() {
    print();
    signUp();
    signUp();
    showList(1);
    return 0;
}